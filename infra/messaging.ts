// Create topic for user notifications first
export const notificationTopic = new sst.aws.SnsTopic("Notifications");

// Create dead letter queue for failed email processing
const emailDLQ = new sst.aws.Queue("EmailDLQ", {
  visibilityTimeout: "2 minutes",
});

// Email Service
export const emailService = new sst.aws.Email("EmailService", {
  sender:
    $app.stage === "production"
      ? "noreply@qwikcalai.com"
      : "noreply-dev@qwikcalai.com",
  events: [
    {
      name: "EmailEvents",
      types: ["bounce", "complaint", "delivery"],
      topic: notificationTopic.arn,
    },
  ],
});

// Queue for email processing
export const emailQueue = new sst.aws.Queue("EmailDelivery", {
  visibilityTimeout: "5 minutes",
  // Send to DLQ after 3 retries
  dlq: {
    queue: emailDLQ.arn,
    retry: 3,
  },
});

// Add subscriber to process emails
emailQueue.subscribe(
  "packages/functions/src/notifications/process-email.main",
  {
    batch: {
      size: 1, // Process one email at a time
      window: "30 seconds",
    },
  }
);

// Image processing notifications
export const imageProcessingTopic = new sst.aws.SnsTopic("ImageProcessing");

// Subscribe image processing function
imageProcessingTopic.subscribe(
  "ImageProcessor",
  "packages/functions/src/processing/process-image.main",
  {
    // Filter only image upload events
    filter: {
      eventType: ["image.uploaded"],
    },
  }
);

// Subscribe notification handlers
notificationTopic.subscribe(
  "EmailNotifier",
  "packages/functions/src/notifications/send-notification.main",
  {
    filter: {
      deliveryMethod: ["email"],
    },
  }
);

// Subscribe the email queue to the notification topic
notificationTopic.subscribeQueue("EmailSubscriber", emailQueue.arn, {
  filter: {
    deliveryMethod: ["email"],
  },
});

// Create FIFO queue for billing events
export const billingQueue = new sst.aws.Queue("BillingQueue", {
  fifo: {
    contentBasedDeduplication: true,
  },
});

billingQueue.subscribe(
  "packages/functions/src/billing/process-subscription.main"
);

// Create FIFO topic for billing events to maintain order
export const billingTopic = new sst.aws.SnsTopic("Billing", {
  fifo: true,
  transform: {
    topic: {
      contentBasedDeduplication: true,
    },
  },
});

// Subscribe billing queue to the topic
billingTopic.subscribeQueue("BillingSubscriber", billingQueue);

// Create queue for async event processing
export const eventProcessingQueue = new sst.aws.Queue("EventProcessing", {
  visibilityTimeout: "5 minutes",
  dlq: {
    queue: new sst.aws.Queue("EventProcessingDLQ").arn,
    retry: 3,
  },
});

// Add subscriber for event processing
eventProcessingQueue.subscribe(
  "packages/functions/src/events/process-event.main",
  {
    batch: {
      // Process events in batches
      size: 10,
      window: "30 seconds",
      // Enable partial batch responses for better error handling
      partialResponses: true,
    },
    filters: [
      {
        body: {
          status: ["pending", "processing"],
        },
      },
    ],
  }
);
