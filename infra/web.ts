import { api } from "./api";
import { identityPool, userPool, userPoolClient } from "./auth";
import { bucket } from "./storage";

const region = aws.getRegionOutput().name;

export const web = new sst.aws.Nextjs("QwikCalAI", {
  path: "packages/frontend",
  domain: $app.stage === "production" ? "qwikcalai.com" : "dev.qwikcalai.com",
  link: [api, bucket],
  environment: {
    NEXT_PUBLIC_REGION: region,
    NEXT_PUBLIC_API_URL: api.url,
    NEXT_PUBLIC_BUCKET: bucket.name,
    NEXT_PUBLIC_USER_POOL_ID: userPool.id,
    NEXT_PUBLIC_IDENTITY_POOL_ID: identityPool.id,
    NEXT_PUBLIC_USER_POOL_CLIENT_ID: userPoolClient.id,
  },
});
