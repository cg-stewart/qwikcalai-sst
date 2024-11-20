import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const main = Monitoring.sqsHandler(async (event: SQSEvent) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const { eventId, userId, status, data } = JSON.parse(record.body);

      // Update event status
      await dynamoDb.send(
        new UpdateCommand({
          TableName: Resource.Events.name,
          Key: { eventId, userId },
          UpdateExpression:
            "SET #status = :status, processedAt = :now, processingData = :data",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": status,
            ":now": Date.now(),
            ":data": data || null,
          },
        })
      );

      // Notify about the status update
      await sns.send(
        new PublishCommand({
          TopicArn: Resource.Notifications.arn,
          Message: JSON.stringify({
            type: "event.processed",
            eventId,
            userId,
            status,
            data,
          }),
        })
      );

      Monitoring.trackEvent("EventProcessed", 1, {
        eventId,
        status,
        success: true,
      });
    } catch (error) {
      Monitoring.logError(error as Error, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });

      Monitoring.trackEvent("EventProcessed", 1, {
        eventId: JSON.parse(record.body).eventId,
        status: "error",
        success: false,
      });
    }
  }

  return { batchItemFailures };
});
