import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Util } from "@qwikcalai/core/util/util";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const eventId = event.pathParameters?.id;
    const updates = JSON.parse(event.body || "{}");

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    // First verify the event exists and belongs to the user
    const existing = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Events.name,
        Key: { eventId, userId },
      })
    );

    if (!existing.Item) {
      throw new Error("Event not found");
    }

    // Generate new ICS file if event details changed
    let icsKey = existing.Item.icsKey;
    if (
      updates.title ||
      updates.startTime ||
      updates.endTime ||
      updates.location ||
      updates.description
    ) {
      icsKey = await Util.generateICSFile({
        ...existing.Item,
        ...updates,
      });
    }

    // Update the event
    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: Resource.Events.name,
        Key: { eventId, userId },
        UpdateExpression:
          "SET #title = :title, startTime = :startTime, endTime = :endTime, #location = :location, description = :description, icsKey = :icsKey, updatedAt = :now",
        ExpressionAttributeNames: {
          "#title": "title",
          "#location": "location",
        },
        ExpressionAttributeValues: {
          ":title": updates.title || existing.Item.title,
          ":startTime": updates.startTime || existing.Item.startTime,
          ":endTime": updates.endTime || existing.Item.endTime,
          ":location": updates.location || existing.Item.location,
          ":description": updates.description || existing.Item.description,
          ":icsKey": icsKey,
          ":now": Date.now(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    // Notify about the update
    await sns.send(
      new PublishCommand({
        TopicArn: Resource.Notifications.arn,
        Message: JSON.stringify({
          type: "event.updated",
          eventId,
          userId,
          updates,
        }),
      })
    );

    Monitoring.trackEvent("EventUpdated", 1, {
      eventId,
      updatedFields: Object.keys(updates),
    });

    return {
      event: result.Attributes,
    };
  }
);
