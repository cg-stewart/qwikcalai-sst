export const bucket = new sst.aws.Bucket("Uploads", {});

export const eventsTable = new sst.aws.Dynamo("Events", {
  fields: {
    eventId: "string",
    userId: "string",
    createdAt: "number",
  },
  primaryIndex: {
    hashKey: "eventId",
    rangeKey: "userId",
  },
  globalIndexes: {
    byUser: {
      hashKey: "userId",
      rangeKey: "createdAt",
    },
  },
});

export const usersTable = new sst.aws.Dynamo("Users", {
  fields: {
    userId: "string",
    email: "string",
    subscriptionStatus: "string",
  },
  primaryIndex: {
    hashKey: "userId",
  },
  globalIndexes: {
    byEmail: {
      hashKey: "email",
    },
    bySubscriptionStatus: {
      hashKey: "subscriptionStatus",
    },
  },
});

export const stripeSecret = new sst.Secret("StripeSecretKey");
export const openAIKey = new sst.Secret("OpenAIKey");
