export const METRICS_CONFIG = {
  namespaces: {
    api: "QwikcalAI/API",
    processing: "QwikcalAI/Processing",
    billing: "QwikcalAI/Billing",
  },
  dimensions: {
    service: "qwikcalai",
    environment: process.env.SST_STAGE,
  },
  // Thresholds for alerts
  thresholds: {
    processingTime: 30000, // 30 seconds
    errorRate: 0.05, // 5%
    subscriptionFailure: 1,
  },
};

// CloudWatch dashboard configuration
export const DASHBOARD_CONFIG = {
  widgets: [
    {
      type: "metric",
      properties: {
        metrics: [
          ["QwikcalAI/Processing", "ImageProcessed", "Success", "true"],
          ["QwikcalAI/Processing", "ImageProcessed", "Success", "false"],
        ],
        period: 300,
        stat: "Sum",
        region: process.env.AWS_REGION,
        title: "Image Processing Success/Failure",
      },
    },
    {
      type: "metric",
      properties: {
        metrics: [
          [
            "QwikcalAI/Processing",
            "ProcessingTime",
            "Operation",
            "ImageProcessing",
          ],
        ],
        period: 300,
        stat: "Average",
        region: process.env.AWS_REGION,
        title: "Image Processing Time",
      },
    },
    {
      type: "metric",
      properties: {
        metrics: [
          ["QwikcalAI/API", "Errors"],
          ["QwikcalAI/Processing", "Errors"],
          ["QwikcalAI/Billing", "Errors"],
        ],
        period: 300,
        stat: "Sum",
        region: process.env.AWS_REGION,
        title: "Error Count by Service",
      },
    },
  ],
};
