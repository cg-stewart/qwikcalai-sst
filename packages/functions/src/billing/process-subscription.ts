import { SNSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Billing } from "@qwikcalai/core/billing";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const main = Monitoring.handler(async (event: SNSEvent) => {
  for (const record of event.Records) {
    try {
      const { userId, eventType, data } = JSON.parse(record.Sns.Message);

      switch (eventType) {
        case "subscription.created":
        case "subscription.updated": {
          await dynamoDb.send(
            new UpdateCommand({
              TableName: Resource.Users.name,
              Key: { userId },
              UpdateExpression: `
              SET subscriptionStatus = :status,
                  subscriptionId = :subId,
                  subscriptionEndDate = :endDate,
                  updatedAt = :now
            `,
              ExpressionAttributeValues: {
                ":status": data.status,
                ":subId": data.subscriptionId,
                ":endDate": data.endDate,
                ":now": Date.now(),
              },
            }),
          );

          // Notify user
          await sns.send(
            new PublishCommand({
              TopicArn: Resource.NotificationTopic.arn,
              Message: JSON.stringify({
                type: "email",
                email: data.email,
                template:
                  eventType === "subscription.created"
                    ? "subscription-welcome"
                    : "subscription-updated",
                data: {
                  status: data.status,
                  endDate: new Date(data.endDate).toLocaleDateString(),
                },
              }),
            }),
          );

          Monitoring.metrics.addMetric("SubscriptionUpdated", 1, {
            type: eventType,
            status: data.status,
          });
          break;
        }

        case "subscription.cancelled": {
          await dynamoDb.send(
            new UpdateCommand({
              TableName: Resource.Users.name,
              Key: { userId },
              UpdateExpression: `
              SET subscriptionStatus = :status,
                  subscriptionEndDate = :endDate,
                  updatedAt = :now
            `,
              ExpressionAttributeValues: {
                ":status": "cancelled",
                ":endDate": data.endDate,
                ":now": Date.now(),
              },
            }),
          );

          Monitoring.metrics.addMetric("SubscriptionCancelled", 1);
          break;
        }
      }
    } catch (error) {
      Monitoring.logError(error as Error, { messageId: record.Sns.MessageId });
    }
  }
});
