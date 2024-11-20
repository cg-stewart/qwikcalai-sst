import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { OpenAI } from "openai";
import { Resource } from "sst";
import ical from "ical-generator";

export interface ExtractedEventData {
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
}

export module Util {
  const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const s3 = new S3Client({});
  const openai = new OpenAI({ apiKey: Resource.OpenAIKey.value });

  export async function validateSubscription(userId: string): Promise<boolean> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Users.name,
        Key: { userId },
      })
    );

    return result.Item?.subscriptionStatus === "premium";
  }

  export async function generateICSFile(
    eventData: ExtractedEventData
  ): Promise<string> {
    const calendar = ical({ name: "QwikcalAI Event" });

    calendar.createEvent({
      start: new Date(eventData.startTime),
      end: eventData.endTime ? new Date(eventData.endTime) : undefined,
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
    });

    const key = `ics/${Date.now()}-${eventData.title
      .toLowerCase()
      .replace(/\s+/g, "-")}.ics`;

    await s3.send(
      new PutObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: key,
        Body: calendar.toString(),
        ContentType: "text/calendar",
      })
    );

    return key;
  }

  export async function processImage(
    imageData: Buffer
  ): Promise<ExtractedEventData> {
    try {
      const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract event details from this image. Return a JSON object with title, startTime (ISO format), endTime (ISO format, optional), location (optional), and description (optional).",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData.toString("base64")}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  }

  export function getEventEmailTemplate(eventData: ExtractedEventData, icsUrl: string): string {
    return `
      <html>
        <body>
          <h1>${eventData.title}</h1>
          ${eventData.location ? `<p>Location: ${eventData.location}</p>` : ''}
          ${eventData.description ? `<p>Description: ${eventData.description}</p>` : ''}
          <p>Start: ${new Date(eventData.startTime).toLocaleString()}</p>
          ${eventData.endTime ? `<p>End: ${new Date(eventData.endTime).toLocaleString()}</p>` : ''}
          <p><a href="${icsUrl}">Add to Calendar</a></p>
        </body>
      </html>
    `;
  }

  export function extractEventData(event: any): { text?: string; image?: string } {
    if (typeof event !== 'object' || event === null) {
      throw new Error('Invalid event data');
    }

    if ('text' in event && typeof event.text === 'string') {
      if (!event.text.trim()) {
        throw new Error('Text cannot be empty');
      }
      return { text: event.text };
    }

    if ('image' in event && typeof event.image === 'string') {
      if (!event.image.trim()) {
        throw new Error('Image data cannot be empty');
      }
      return { image: event.image };
    }

    throw new Error('Invalid event data format');
  }

  export function handler(lambda: Function) {
    return async function (event: any, context: any) {
      let body, statusCode;

      try {
        body = await lambda(event, context);
        statusCode = 200;
      } catch (error) {
        console.error(error);
        body = { error: error instanceof Error ? error.message : String(error) };
        statusCode = 500;
      }

      return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
      };
    };
  }
}
