import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Billing } from "@qwikcalai/core/billing";

export const main = Monitoring.handler(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    const email = event.requestContext.authorizer.jwt.claims.email as string;
    const { paymentMethodId } = JSON.parse(event.body || "{}");

    const subscription = await Billing.createSubscription({
      userId,
      email,
      paymentMethodId,
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent
        ?.client_secret,
    };
  },
);
