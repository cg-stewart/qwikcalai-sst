import { describe, test, expect, vi, beforeEach } from "vitest";
import { Billing } from "./index";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import Stripe from "stripe";

// Mock AWS SDK
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn(),
    })),
  },
  GetCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

// Mock Stripe
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
    },
  })),
}));

const mockDynamoDb = {
  send: vi.fn(),
};

const mockStripe = {
  customers: {
    create: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
  },
} as unknown as Stripe;

describe("Billing Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoDb as any);
  });

  describe("validateSubscription", () => {
    test("should return true for premium user", async () => {
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { subscriptionStatus: "premium" },
      });

      const result = await Billing.validateSubscription("premium-user-id");
      expect(result).toBe(true);
    });

    test("should return false for free user", async () => {
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: { subscriptionStatus: "free" },
      });

      const result = await Billing.validateSubscription("free-user-id");
      expect(result).toBe(false);
    });
  });

  describe("createSubscription", () => {
    test("should create subscription successfully", async () => {
      const mockCustomerResponse = {
        id: "cus_123",
        object: "customer",
        created: Date.now(),
        balance: 0,
        currency: null,
        default_source: null,
        delinquent: false,
        description: null,
        discount: null,
        email: "test@example.com",
        invoice_prefix: "ABC",
        invoice_settings: {
          custom_fields: null,
          default_payment_method: null,
          footer: null,
          rendering_options: null,
        },
        livemode: false,
        metadata: {},
        name: null,
        next_invoice_sequence: 1,
        phone: null,
        preferred_locales: [],
        shipping: null,
        tax_exempt: "none",
        test_clock: null,
        lastResponse: {
          headers: {},
          requestId: "req_123",
          statusCode: 200,
          apiVersion: "2023-10-16",
        },
      } as Stripe.Response<Stripe.Customer>;

      const mockSubscriptionResponse = {
        id: "sub_123",
        object: "subscription",
        application: null,
        application_fee_percent: null,
        automatic_tax: {
          enabled: false,
          liability: null,
        },
        billing_cycle_anchor: 1672531200,
        billing_cycle_anchor_config: null,
        billing_thresholds: null,
        cancel_at: null,
        cancel_at_period_end: false,
        canceled_at: null,
        cancellation_details: null,
        collection_method: "charge_automatically",
        created: 1672531200,
        currency: "usd",
        current_period_end: 1675209600,
        current_period_start: 1672531200,
        customer: "cus_123",
        days_until_due: null,
        default_payment_method: null,
        default_source: null,
        default_tax_rates: [],
        description: null,
        discount: null,
        discounts: [],
        ended_at: null,
        invoice_settings: {
          issuer: {
            type: "self",
          },
          account_tax_ids: null,
        },
        items: {
          object: "list",
          data: [],
          has_more: false,
          url: "/v1/subscription_items?subscription=sub_123",
        },
        latest_invoice: null,
        livemode: false,
        metadata: {},
        next_pending_invoice_item_invoice: null,
        pause_collection: null,
        payment_settings: {
          payment_method_options: null,
          payment_method_types: null,
          save_default_payment_method: "off",
        },
        pending_invoice_item_interval: null,
        pending_setup_intent: null,
        pending_update: null,
        schedule: null,
        start_date: 1672531200,
        status: "active",
        test_clock: null,
        transfer_data: null,
        trial_end: null,
        trial_start: null,
        on_behalf_of: null,
        trial_settings: {
          end_behavior: {
            missing_payment_method: "create_invoice",
          },
        },
        lastResponse: {
          headers: {},
          requestId: "req_123",
          statusCode: 200,
          apiVersion: "2022-11-15",
        },
      } as const satisfies Stripe.Response<Stripe.Subscription>;

      vi.mocked(mockStripe.customers.create).mockResolvedValueOnce(
        mockCustomerResponse
      );
      vi.mocked(mockStripe.subscriptions.create).mockResolvedValueOnce(
        mockSubscriptionResponse
      );

      const result = await Billing.createSubscription({
        userId: "test-user",
        email: "test@example.com",
        paymentMethodId: "pm_123",
      });

      expect(result).toEqual({
        customerId: "cus_123",
        subscriptionId: "sub_123",
        status: "active",
      });
    });
  });

  describe("PRICING_TIERS", () => {
    test("should have correct free tier configuration", () => {
      expect(Billing.PRICING_TIERS[0]).toEqual({
        name: "Free",
        events: 10,
        price: 0,
        features: ["Manual event creation", "Basic .ics download"],
      });
    });

    test("should have correct premium tier configuration", () => {
      expect(Billing.PRICING_TIERS[1]).toEqual({
        name: "Premium",
        events: 100,
        price: 500,
        features: [
          "AI image processing",
          "Email/SMS delivery",
          "Unlimited downloads",
          "Priority support",
        ],
      });
    });
  });
});
