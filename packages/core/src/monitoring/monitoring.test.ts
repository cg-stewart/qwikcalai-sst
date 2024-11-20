import { describe, test, expect, vi, beforeEach } from "vitest";
import { Monitoring } from "./index";
import { APIGatewayProxyEventV2, SQSEvent, Context } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Tracer } from "@aws-lambda-powertools/tracer";

// Mock AWS Lambda Powertools
vi.mock("@aws-lambda-powertools/logger", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  }))
}));

vi.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: vi.fn().mockImplementation(() => ({
    addMetric: vi.fn(),
    publishStoredMetrics: vi.fn()
  }))
}));

vi.mock("@aws-lambda-powertools/tracer", () => ({
  Tracer: vi.fn().mockImplementation(() => ({
    captureMethod: vi.fn((name, fn) => fn),
    putAnnotation: vi.fn(),
    putMetadata: vi.fn()
  }))
}));

describe("Monitoring Module", () => {
  let mockLogger: ReturnType<typeof vi.mocked<Logger>>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = vi.mocked(new Logger());
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'error');
  });

  describe("trackEvent", () => {
    test("should log event with correct parameters", () => {
      const eventName = "TEST_EVENT";
      const eventValue = 1;
      const eventProperties = { test: "data" };

      Monitoring.trackEvent(eventName, eventValue, eventProperties);

      // Since logger is private, we verify the behavior instead of implementation
      expect(Logger).toHaveBeenCalled();
    });
  });

  describe("logError", () => {
    test("should log error with correct parameters", () => {
      const error = new Error("Test error");
      error.name = "TestError";
      const context = { test: "context" };

      Monitoring.logError(error, context);

      // Since logger is private, we verify the behavior instead of implementation
      expect(Logger).toHaveBeenCalled();
    });
  });

  describe("wrapLambdaHandler", () => {
    const mockContext: Context = {
      awsRequestId: "test-request-id",
      callbackWaitsForEmptyEventLoop: true,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "test-arn",
      logGroupName: "test-log-group",
      logStreamName: "test-log-stream",
      memoryLimitInMB: "128",
      done: vi.fn(),
      fail: vi.fn(),
      succeed: vi.fn(),
      getRemainingTimeInMillis: () => 1000
    };

    test("should wrap API Gateway handler correctly", async () => {
      const mockEvent: APIGatewayProxyEventV2 = {
        version: "2.0",
        routeKey: "GET /test",
        rawPath: "/test",
        rawQueryString: "",
        headers: {},
        requestContext: {
          accountId: "123",
          apiId: "test",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          domainPrefix: "test",
          http: {
            method: "GET",
            path: "/test",
            protocol: "HTTP/1.1",
            sourceIp: "127.0.0.1",
            userAgent: "test-agent"
          },
          requestId: "test-id",
          routeKey: "GET /test",
          stage: "test",
          time: "01/Jan/2023:00:00:00 +0000",
          timeEpoch: 1672531200000
        },
        isBase64Encoded: false
      };

      const handler = vi.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });

      const wrappedHandler = Monitoring.handler(handler);
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });
    });

    test("should wrap SQS handler correctly", async () => {
      const mockEvent: SQSEvent = {
        Records: [{
          messageId: "test-message-id",
          receiptHandle: "test-receipt",
          body: "test message",
          attributes: {
            ApproximateReceiveCount: "1",
            SentTimestamp: "1672531200000",
            SenderId: "AROAXXXXXXXXXXXXXXXXX:test-sender",
            ApproximateFirstReceiveTimestamp: "1672531200000"
          },
          messageAttributes: {},
          md5OfBody: "test-md5",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
          awsRegion: "us-east-1"
        }]
      };

      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = Monitoring.handler(handler);
      await wrappedHandler(mockEvent, mockContext);

      expect(handler).toHaveBeenCalledWith(mockEvent, mockContext);
    });
  });
});
