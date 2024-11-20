import { describe, test, expect, vi, beforeEach } from "vitest";
import { Util } from "./util";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ExtractedEventData } from "./util";
import ical from "ical-generator";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  PutObjectCommand: vi.fn()
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn()
    }))
  },
  GetCommand: vi.fn(),
  UpdateCommand: vi.fn()
}));

// Mock ical-generator
vi.mock("ical-generator", () => ({
  default: {
    createEvent: vi.fn(() => ({
      createEvent: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        summary: vi.fn().mockReturnThis(),
        description: vi.fn().mockReturnThis(),
        location: vi.fn().mockReturnThis()
      })),
      toString: vi.fn(() => "mock-ics-content")
    }))
  }
}));

describe("Util Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateICSFile", () => {
    test("should generate ICS file successfully", async () => {
      const mockS3 = {
        send: vi.fn().mockResolvedValueOnce({})
      };
      vi.mocked(S3Client).mockImplementation(() => mockS3 as any);

      const eventData: ExtractedEventData = {
        title: "Test Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        location: "Test Location",
        description: "Test Description"
      };

      const result = await Util.generateICSFile(eventData);
      expect(result).toBeDefined();
      expect(mockS3.send).toHaveBeenCalled();
    });

    test("should handle missing optional fields", async () => {
      const mockS3 = {
        send: vi.fn().mockResolvedValueOnce({})
      };
      vi.mocked(S3Client).mockImplementation(() => mockS3 as any);

      const eventData: ExtractedEventData = {
        title: "Test Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        location: "",
        description: ""
      };

      const result = await Util.generateICSFile(eventData);
      expect(result).toBeDefined();
      expect(mockS3.send).toHaveBeenCalled();
    });
  });

  describe("getEventEmailTemplate", () => {
    test("should generate email template with all fields", () => {
      const eventData: ExtractedEventData = {
        title: "Test Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        location: "Test Location",
        description: "Test Description"
      };
      const icsUrl = "https://example.com/event.ics";

      const template = Util.getEventEmailTemplate(eventData, icsUrl);
      expect(template).toContain(eventData.title);
      expect(template).toContain(eventData.location);
      expect(template).toContain(eventData.description);
      expect(template).toContain(icsUrl);
    });

    test("should handle missing optional fields", () => {
      const eventData: ExtractedEventData = {
        title: "Test Event",
        startTime: "2024-01-01T10:00:00Z",
        endTime: "2024-01-01T11:00:00Z",
        location: "",
        description: ""
      };
      const icsUrl = "https://example.com/event.ics";

      const template = Util.getEventEmailTemplate(eventData, icsUrl);
      expect(template).toContain(eventData.title);
      expect(template).toContain(icsUrl);
    });
  });

  describe("extractEventData", () => {
    test("should extract data from text event", () => {
      const event = { text: "Hello world" };
      const result = Util.extractEventData(event);
      expect(result).toEqual({ text: "Hello world" });
    });

    test("should extract data from image event", () => {
      const event = { image: "base64data" };
      const result = Util.extractEventData(event);
      expect(result).toEqual({ image: "base64data" });
    });

    test("should validate event data", () => {
      const validEvent = { text: "Hello world" };
      const result = Util.extractEventData(validEvent);
      expect(result).toEqual({ text: "Hello world" });
    });

    test("should throw error for invalid event data", () => {
      const invalidEvent = { invalid: "data" };
      expect(() => Util.extractEventData(invalidEvent)).toThrow();
    });

    test("should validate event data with empty text", () => {
      const emptyEvent = { text: "" };
      expect(() => Util.extractEventData(emptyEvent)).toThrow();
    });

    test("should validate event data with empty image", () => {
      const emptyEvent = { image: "" };
      expect(() => Util.extractEventData(emptyEvent)).toThrow();
    });
  });
});
