import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { SNSEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Util } from "@qwikcalai/core/util/util";

const s3 = new S3Client({});
const sns = new SNSClient({});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2 | SNSEvent, context?: Context) => {
    const batchItemFailures: { itemIdentifier: string }[] = [];

    // Determine the records based on event type
    const records =
      "Records" in event
        ? event.Records
        : event.body
        ? [{ Sns: { Message: event.body } }]
        : [];

    for (const record of records) {
      const startTime = Date.now();
      try {
        // Parse the message, handling both SNS and direct event body
        const messageData =
          "Sns" in record
            ? JSON.parse(record.Sns.Message)
            : JSON.parse(record as unknown as string);

        const { eventId, userId, imageKey } = messageData;

        // Get image from S3
        const imageResult = await s3.send(
          new GetObjectCommand({
            Bucket: Resource.Uploads.name,
            Key: imageKey,
          })
        );

        // Process with OpenAI
        const imageBuffer = Buffer.from(
          await imageResult.Body!.transformToByteArray()
        );
        const eventData = await Util.processImage(imageBuffer);

        // Generate ICS file
        const icsKey = await Util.generateICSFile(eventData);

        // Update event record
        await dynamoDb.send(
          new UpdateCommand({
            TableName: Resource.Events.name,
            Key: { eventId, userId },
            UpdateExpression: `
          SET title = :title,
              startTime = :startTime,
              endTime = :endTime,
              location = :location,
              description = :description,
              icsKey = :icsKey,
              status = :status,
              processingTime = :processingTime`,
            ExpressionAttributeValues: {
              ":title": eventData.title,
              ":startTime": eventData.startTime,
              ":endTime": eventData.endTime,
              ":location": eventData.location,
              ":description": eventData.description,
              ":icsKey": icsKey,
              ":status": "processed",
              ":processingTime": Date.now() - startTime,
            },
          })
        );

        // Publish to SNS for further processing
        await sns.send(
          new PublishCommand({
            TopicArn: Resource.Notifications.arn,
            Message: JSON.stringify({
              eventId,
              userId,
              icsKey,
            }),
          })
        );
      } catch (error) {
        console.error("Processing error:", error);
        batchItemFailures.push({
          itemIdentifier:
            record.Sns && "MessageId" in record.Sns
              ? record.Sns.MessageId
              : "unknown",
        });
      }
    }

    return { batchItemFailures };
  }
);
