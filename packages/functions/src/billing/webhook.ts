import { APIGatewayProxyEventV2 } from "aws-lambda";
import Stripe from "stripe";
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Monitoring } from "@qwikcalai/core/monitoring";

const stripe = new Stripe(Resource.StripeSecretKey.value, {
  apiVersion: "2024-10-28.acacia",
});
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2) => {
    const sig = event.headers["stripe-signature"];
    const webhookSecret = Resource.StripeSecretKey.value;

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig!,
      webhookSecret
    );

    // Type guard to ensure we're working with a subscription event
    if (
      stripeEvent.type === "customer.subscription.created" ||
      stripeEvent.type === "customer.subscription.updated"
    ) {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const { userId } = subscription.metadata;

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
        })
      );

      await sns.send(
        new PublishCommand({
          TopicArn: Resource.Notifications.arn,
          Message: JSON.stringify({
            type: "subscription.updated",
            userId,
            status: subscription.status,
          }),
        })
      );
    }

    return { received: true };
  }
);
