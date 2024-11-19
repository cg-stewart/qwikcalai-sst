import { SQSEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const s3 = new S3Client({});
const ses = new SESClient({});

export const main = Monitoring.handler(async (event: SQSEvent) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const { eventId, recipient, icsKey } = JSON.parse(record.body);

      // Get ICS file from S3
      const icsResult = await s3.send(
        new GetObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: icsKey,
        }),
      );

      const icsContent = await icsResult.Body?.transformToString();

      // Send email with attachment
      await ses.send(
        new SendEmailCommand({
          Destination: { ToAddresses: [recipient] },
          Message: {
            Subject: { Data: "Your Calendar Event from QwikcalAI" },
            Body: {
              Html: { Data: getEventEmailTemplate(eventId) },
            },
          },
          Source: Resource.EmailService.sender,
        }),
      );

      Monitoring.metrics.addMetric("ICSDelivered", 1, {
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
