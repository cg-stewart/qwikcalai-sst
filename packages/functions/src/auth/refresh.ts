import { APIGatewayProxyEvent } from "aws-lambda";
import { Monitoring } from "@qwikcalai/core/monitoring";
import { Util } from "@qwikcalai/core/util/util";
import { Auth } from "aws-amplify";

export const main = Monitoring.handler(async (event: APIGatewayProxyEvent) => {
  const authHeader = event.headers.Authorization;
  if (!authHeader) throw new Error("No refresh token provided");

  const refreshToken = authHeader.replace("Bearer ", "");
  const session = await Auth.currentSession();
  return { token: session.getIdToken().getJwtToken() };
});
