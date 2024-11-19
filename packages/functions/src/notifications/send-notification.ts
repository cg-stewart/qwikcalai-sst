import { SNSEvent } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const ses = new SESClient({});

export const main = Monitoring.handler(async (event: SNSEvent) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      const { email, template, data } = message;

      await ses.send(
        new SendEmailCommand({
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: `QwikcalAI - ${template}` },
            Body: {
              Html: {
                Data: getEmailTemplate(template, data),
              },
            },
          },
          Source: Resource.EmailService.sender,
        }),
      );

      Monitoring.metrics.addMetric("EmailSent", 1, {
        template,
        success: true,
      });
    } catch (error) {
      Monitoring.logError(error as Error, { messageId: record.Sns.MessageId });
      batchItemFailures.push({ itemIdentifier: record.Sns.MessageId });
    }
  }

  return { batchItemFailures };
});
