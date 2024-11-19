import { api } from "./api";
import { bucket } from "./storage";

const region = aws.getRegionOutput().name;

export const userPool = new sst.aws.CognitoUserPool("QwikCalUserPool", {
  usernames: ["email"],
  triggers: {
    postConfirmation: "packages/functions/src/auth/postConfirmation.main",
  },
});

export const userPoolClient = userPool.addClient("QwikCalUserPoolClient");

export const identityPool = new sst.aws.CognitoIdentityPool(
  "QwikCalIdentityPool",
  {
    userPools: [
      {
        userPool: userPool.id,
        client: userPoolClient.id,
      },
    ],
    permissions: {
      authenticated: [
        // S3 permissions for file uploads
        {
          actions: ["s3:*"],
          resources: [
            $concat(
              bucket.arn,
              "/private/${cognito-identity.amazonaws.com:sub}/*",
            ),
          ],
        },
        // API Gateway permissions
        {
          actions: ["execute-api:*"],
          resources: [
            $concat(
              "arn:aws:execute-api:",
              region,
              ":",
              aws.getCallerIdentityOutput({}).accountId,
              ":",
              api.nodes.api.id,
              "/*/*/*",
            ),
          ],
        },
      ],
    },
  },
);
