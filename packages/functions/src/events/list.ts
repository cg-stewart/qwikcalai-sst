import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { Monitoring } from "@qwikcalai/core/monitoring";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const { limit = "50", nextToken } = event.queryStringParameters || {};

    const result = await dynamoDb.send(
      new QueryCommand({
        TableName: Resource.Events.name,
        IndexName: "byUser",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
        Limit: parseInt(limit),
        ExclusiveStartKey: nextToken
          ? JSON.parse(Buffer.from(nextToken, "base64").toString())
          : undefined,
      }),
    );

    return {
      events: result.Items,
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64",
          )
        : null,
    };
  },
);
