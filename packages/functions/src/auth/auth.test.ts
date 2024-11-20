import { describe, test, expect, vi, beforeEach } from "vitest";
import { PostConfirmationTriggerEvent, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { main as postConfirmation } from "./postConfirmation";

// Mock AWS SDK
vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn()
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn()
    }))
  },
  PutCommand: vi.fn()
}));

describe("Auth Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("postConfirmation", () => {
    const mockEvent: PostConfirmationTriggerEvent = {
      version: "1",
      region: "us-east-1",
      userPoolId: "us-east-1_123456789",
      userName: "test-user",
      callerContext: {
        awsSdkVersion: "1.0.0",
        clientId: "test-client-id"
      },
      triggerSource: "PostConfirmation_ConfirmSignUp",
      request: {
        userAttributes: {
          sub: "test-sub",
          email: "test@example.com",
          email_verified: "true",
          name: "Test User"
        }
      },
      response: {}
    };

    const mockContext: Context = {
      callbackWaitsForEmptyEventLoop: true,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "test-arn",
      memoryLimitInMB: "128",
      awsRequestId: "test-request-id",
      logGroupName: "test-log-group",
      logStreamName: "test-log-stream",
      getRemainingTimeInMillis: () => 1000,
      done: vi.fn(),
      fail: vi.fn(),
      succeed: vi.fn()
    };

    test("should create user record successfully", async () => {
      const mockDynamoDb = {
        send: vi.fn().mockResolvedValueOnce({})
      };

      vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoDb as any);

      const result = await postConfirmation(mockEvent);

      expect(result).toEqual(mockEvent);
      expect(mockDynamoDb.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Item: expect.objectContaining({
              userId: mockEvent.request.userAttributes.sub,
              email: mockEvent.request.userAttributes.email,
              name: mockEvent.request.userAttributes.name
            })
          })
        })
      );
    });

    test("should handle DynamoDB error", async () => {
      const mockError = new Error("DynamoDB error");
      const mockDynamoDb = {
        send: vi.fn().mockRejectedValueOnce(mockError)
      };

      vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoDb as any);

      await expect(postConfirmation(mockEvent)).rejects.toThrow(mockError);
    });

    test("should handle missing user attributes", async () => {
      const invalidEvent = {
        ...mockEvent,
        request: {
          userAttributes: {}
        }
      };

      const mockDynamoDb = {
        send: vi.fn().mockResolvedValueOnce({})
      };

      vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoDb as any);

      await expect(postConfirmation(invalidEvent as any)).rejects.toThrow();
    });
  });
});
