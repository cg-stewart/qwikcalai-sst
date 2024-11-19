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

export const main = Monitoring.handler(async (event: SNSEvent) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    const startTime = Date.now();
    try {
      const { eventId, userId, imageKey } = JSON.parse(record.Sns.Message);

      // Get image from S3
      const imageResult = await s3.send(
        new GetObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: imageKey,
        }),
      );

      // Process with OpenAI
      const eventData = await Util.processImage(
        await imageResult.Body!.transformToByteArray(),
      );

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
              processedAt = :now,
              updatedAt = :now
        `,
          ExpressionAttributeValues: {
            ":title": eventData.title,
            ":startTime": eventData.startTime,
            ":endTime": eventData.endTime,
            ":location": eventData.location,
            ":description": eventData.description,
            ":icsKey": icsKey,
            ":status": "completed",
            ":now": Date.now(),
          },
        }),
      );

      // Notify completion
      await sns.send(
        new PublishCommand({
          TopicArn: Resource.NotificationTopic.arn,
          Message: JSON.stringify({
            type: "event.processed",
            eventId,
            userId,
            success: true,
            data: eventData,
          }),
        }),
      );

      Monitoring.metrics.addMetric("ImageProcessed", 1, {
        success: true,
        processingTime: Date.now() - startTime,
      });
    } catch (error) {
      Monitoring.logError(error as Error, { messageId: record.Sns.MessageId });
      batchItemFailures.push({ itemIdentifier: record.Sns.MessageId });
    }
  }

  return { batchItemFailures };
});
