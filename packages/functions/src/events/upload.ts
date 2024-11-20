import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { v4 as uuid } from "uuid";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Billing } from "@qwikcalai/core/billing";

const s3 = new S3Client({});
const sns = new SNSClient({});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;

    const isPremium = await Billing.validateSubscription(userId);
    if (!isPremium) throw new Error("Premium subscription required");

    const buffer = Buffer.from(event.body || "", "base64");
    const eventId = uuid();
    const key = `uploads/${userId}/${eventId}.jpg`;

    await s3.send(
      new PutObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      })
    );

    await dynamoDb.send(
      new PutCommand({
        TableName: Resource.Events.name,
        Item: {
          eventId,
          userId,
          imageKey: key,
          status: "processing",
          createdAt: Date.now(),
        },
      })
    );

    await sns.send(
      new PublishCommand({
        TopicArn: Resource.Notifications.arn,
        Message: JSON.stringify({
          type: "image.uploaded",
          eventId,
          userId,
          imageKey: key,
        }),
      })
    );

    return { eventId, status: "processing" };
  }
);
