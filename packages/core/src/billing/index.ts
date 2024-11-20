import Stripe from "stripe";
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export module Billing {
  const stripe = new Stripe(Resource.StripeSecretKey.value, {
    apiVersion: "2024-10-28.acacia"
  });

  const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  export interface PricingTier {
    name: string;
    events: number;
    price: number;
    features: string[];
  }

  export const PRICING_TIERS: PricingTier[] = [
    {
      name: "Free",
      events: 10,
      price: 0,
      features: ["Manual event creation", "Basic .ics download"],
    },
    {
      name: "Premium",
      events: 100,
      price: 500,
      features: [
        "AI image processing",
        "Email/SMS delivery",
        "Unlimited downloads",
        "Priority support",
      ],
    },
  ];

  // Stripe product and price IDs
  const STRIPE_PRICES = {
    premium: "price_1QNAfrP47UgKiQ7uEUZbAvFN"
  } as const;

  export async function createSubscription(params: {
    userId: string;
    email: string;
    paymentMethodId: string;
  }) {
    const customer = await stripe.customers.create({
      email: params.email,
      payment_method: params.paymentMethodId,
      metadata: { userId: params.userId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: STRIPE_PRICES.premium }],
      payment_behavior: "default_incomplete",
      metadata: { userId: params.userId },
      expand: ["latest_invoice.payment_intent"],
    });

    await dynamoDb.send(
      new UpdateCommand({
        TableName: Resource.Users.name,
        Key: { userId: params.userId },
        UpdateExpression:
          "SET subscriptionStatus = :status, stripeCustomerId = :customerId, subscriptionId = :subId, updatedAt = :now",
        ExpressionAttributeValues: {
          ":status": "premium",
          ":customerId": customer.id,
          ":subId": subscription.id,
          ":now": Date.now(),
        },
      }),
    );

    return subscription;
  }

  export async function validateSubscription(userId: string): Promise<boolean> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: Resource.Users.name,
        Key: { userId },
      }),
    );

    return result.Item?.subscriptionStatus === "premium";
  }

  export function calculateUsage(eventCount: number): number {
    const tier = PRICING_TIERS.find((t) => eventCount <= t.events);
    return tier ? tier.price : PRICING_TIERS[PRICING_TIERS.length - 1].price;
  }
}
