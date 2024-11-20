/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "qwikcalai",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { stripe: "0.0.24" },
    };
  },
  async run() {
    await import("./infra/storage");
    const api = await import("./infra/api");
    const auth = await import("./infra/auth");
    const web = await import("./infra/web");

    return {
      // API Endpoints
      apiUrl: api.api.url,
      frontendUrl: web.web.url,

      // Auth Configuration
      userPool: auth.userPool.id,
      userPoolClient: auth.userPoolClient.id,
      identityPool: auth.identityPool.id,

      // Region Information
      region: aws.getRegionOutput().name,
    };
  },
});
