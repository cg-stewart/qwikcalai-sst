import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const sns = new SNSClient({});

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const eventId = event.pathParameters?.id;

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    // First get the event to check ownership and get ICS key
    const existing = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Events.name,
        Key: { eventId, userId },
      })
    );

    if (!existing.Item) {
      throw new Error("Event not found");
    }

    // Delete the event
    await dynamoDb.send(
      new DeleteCommand({
        TableName: Resource.Events.name,
        Key: { eventId, userId },
      })
    );

    // Delete associated ICS file if it exists
    if (existing.Item.icsKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: existing.Item.icsKey,
        })
      );
    }

    // Delete associated image if it exists
    if (existing.Item.imageKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: existing.Item.imageKey,
        })
      );
    }

    // Notify about the deletion
    await sns.send(
      new PublishCommand({
        TopicArn: Resource.Notifications.arn,
        Message: JSON.stringify({
          type: "event.deleted",
          eventId,
          userId,
        }),
      })
    );

    Monitoring.trackEvent("EventDeleted", 1, {
      eventId,
      hadImage: !!existing.Item.imageKey,
    });

    return {
      status: "deleted",
    };
  }
);
