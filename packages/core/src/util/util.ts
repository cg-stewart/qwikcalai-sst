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
      }),
    );

    return result.Item?.subscriptionStatus === "premium";
  }

  export async function generateICSFile(
    eventData: ExtractedEventData,
  ): Promise<string> {
    const calendar = ical({ name: "QwikcalAI Event" });

    calendar.createEvent({
      start: new Date(eventData.startTime),
      end: eventData.endTime ? new Date(eventData.endTime) : undefined,
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
    });

    const key = `ics/${Date.now()}-${eventData.title.toLowerCase().replace(/\s+/g, "-")}.ics`;

    await s3.send(
      new PutObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: key,
        Body: calendar.toString(),
        ContentType: "text/calendar",
      }),
    );

    return key;
  }

  export async function processImage(
    imageData: Buffer,
  ): Promise<ExtractedEventData> {
    const base64Image = imageData.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract event details from this image. Return a JSON object with title, startTime (ISO string), endTime (ISO string), location, and description. If any field is unclear, omit it.",
            },
            {
              type: "image_url",
              image_url: `data:image/jpeg;base64,${base64Image}`,
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    return JSON.parse(
      response.choices[0].message.content,
    ) as ExtractedEventData;
  }

  export function handler(lambda: Function) {
    return async function (event: any, context: any) {
      try {
        return {
          statusCode: 200,
          body: await lambda(event, context),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
        };
      } catch (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
        };
      }
    };
  }
}
