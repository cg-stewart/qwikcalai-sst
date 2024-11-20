import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Resource } from "sst";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Billing } from "@qwikcalai/core/billing";

const s3 = new S3Client({});
const sqs = new SQSClient({});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const eventId = event.pathParameters?.id;

    const isPremium = await Billing.validateSubscription(userId);
    if (!isPremium)
      throw new Error("Premium subscription required for delivery");

    const { method, recipient } = JSON.parse(event.body || "{}");

    const result = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Events.name,
        Key: { eventId, userId },
      })
    );

    if (!result.Item) throw new Error("Event not found");

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: Resource.EmailDelivery.url,
        MessageBody: JSON.stringify({
          recipient,
          method,
          eventId,
          userId,
        }),
      })
    );

    return { status: "delivery_queued" };
  }
);
