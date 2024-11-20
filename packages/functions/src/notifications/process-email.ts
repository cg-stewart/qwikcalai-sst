import { SQSEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Util } from "@qwikcalai/core/util/util";
import { ExtractedEventData } from "@qwikcalai/core/util/util";

const s3 = new S3Client({});
const ses = new SESClient({});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.sqsHandler(async (event: SQSEvent) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const { eventId, recipient, icsKey } = JSON.parse(record.body);

      // Get ICS file from S3
      const icsResult = await s3.send(
        new GetObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: icsKey,
        })
      );

      const icsContent = await icsResult.Body?.transformToString();

      // Get event data from DynamoDB
      const eventResult = await dynamoDb.send(
        new GetCommand({
          TableName: Resource.Events.name,
          Key: { eventId },
        })
      );

      if (!eventResult.Item) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const eventData: ExtractedEventData = {
        title: eventResult.Item.title,
        startTime: eventResult.Item.startTime,
        endTime: eventResult.Item.endTime,
        location: eventResult.Item.location,
        description: eventResult.Item.description,
      };

      const icsUrl = `${Resource.QwikCalApi.url}/events/${eventId}/calendar`;

      // Send email with attachment
      await ses.send(
        new SendEmailCommand({
          Destination: { ToAddresses: [recipient] },
          Message: {
            Subject: { Data: "Your Calendar Event from QwikcalAI" },
            Body: {
              Html: {
                Data: Util.getEventEmailTemplate(eventData, icsUrl),
              },
            },
          },
          Source: Resource.EmailDelivery.url,
        })
      );

      Monitoring.trackEvent("ICSDelivered", 1, {
        method: "email",
        success: true,
      });
    } catch (error) {
      Monitoring.logError(error as Error, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
});
