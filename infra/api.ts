import { bucket, eventsTable, usersTable } from "./storage";

export const api = new sst.aws.ApiGatewayV2("QwikCalApi", {
  domain:
    $app.stage === "production" ? "api.qwikcalai.com" : "api-dev.qwikcalai.com",
  transform: {
    route: {
      handler: {
        link: [eventsTable, usersTable, bucket],
      },
      args: {
        auth: { iam: true },
      },
    },
  },
});

api.route("POST /auth/refresh", "packages/functions/src/auth/refresh.main");

// Event routes
api.route("GET /events", "packages/functions/src/events/list.main");
api.route("POST /events", "packages/functions/src/events/create.main");
api.route("GET /events/{id}", "packages/functions/src/events/get.main");
api.route("PUT /events/{id}", "packages/functions/src/events/update.main");
api.route("DELETE /events/{id}", "packages/functions/src/events/delete.main");
api.route("POST /events/upload", "packages/functions/src/events/upload.main");
api.route(
  "POST /events/{id}/deliver",
  "packages/functions/src/events/deliver.main",
);

// Subscription routes
api.route("POST /billing/create", "packages/functions/src/billing/create.main");
api.route(
  "POST /billing/webhook",
  "packages/functions/src/billing/webhook.main",
);
