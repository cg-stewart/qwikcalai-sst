import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const eventId = event.pathParameters?.id;

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const result = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Events.name,
        Key: {
          eventId,
          userId, // Ensures user can only access their own events
        },
      })
    );

    if (!result.Item) {
      throw new Error("Event not found");
    }

    Monitoring.trackEvent("EventRetrieved", 1, {
      eventId,
    });

    return {
      event: result.Item,
    };
  }
);
