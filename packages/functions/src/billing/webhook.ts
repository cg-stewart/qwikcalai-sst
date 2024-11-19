import { APIGatewayProxyEvent } from "aws-lambda";
import Stripe from "stripe";
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Monitoring } from "@qwikcalai/core/monitoring";

const stripe = new Stripe(Resource.StripeSecretKey.value, {
  apiVersion: "2023-10-16",
});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const main = Monitoring.handler(async (event: APIGatewayProxyEvent) => {
  const sig = event.headers["stripe-signature"];
  const webhookSecret = Resource.StripeSecretKey.webhookSecret;

  const stripeEvent = stripe.webhooks.constructEvent(
    event.body!,
    sig!,
    webhookSecret,
  );

  const { userId } = stripeEvent.data.object.metadata;

  switch (stripeEvent.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;

      await dynamoDb.send(
        new UpdateCommand({
          TableName: Resource.Users.name,
          Key: { userId },
          UpdateExpression:
            "SET subscriptionStatus = :status, subscriptionEndDate = :endDate",
          ExpressionAttributeValues: {
            ":status": subscription.status === "active" ? "premium" : "free",
            ":endDate": subscription.current_period_end * 1000,
          },
        }),
      );

      await sns.send(
        new PublishCommand({
          TopicArn: Resource.NotificationTopic.arn,
          Message: JSON.stringify({
            type: "subscription.updated",
            userId,
            status: subscription.status,
          }),
        }),
      );
      break;
    }
  }

  return { received: true };
});
