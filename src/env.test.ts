import { describe, expect, it } from "vitest";
import { readEnv } from "@/env";

describe("readEnv", () => {
  it("should return the full environment", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      G2BULK_BASE_URL: "https://api.example.com/",
      G2BULK_WEBHOOK_SECRET: "webhook-secret",
      PAYMENT_PROVIDER: "instapay",
    });

    expect(env).toEqual({
      g2bulkApiKey: "api-key",
      g2bulkBaseUrl: "https://api.example.com",
      g2bulkWebhookSecret: "webhook-secret",
      paymentMode: "instapay",
      operationsMode: "sandbox",
      authSecret: "",
      adminPassword: "",
      jobsSecret: "",
      allowFakeFulfilment: false,
    });
  });

  it("should throw an error if G2BULK_API_KEY is missing", () => {
    expect(() =>
      readEnv({
        G2BULK_BASE_URL: "https://api.example.com/",
        G2BULK_WEBHOOK_SECRET: "webhook-secret",
        PAYMENT_PROVIDER: "instapay",
      })
    ).toThrow("G2BULK_API_KEY is required");
  });

  it("should throw an error if G2BULK_API_KEY is blank", () => {
    expect(() =>
      readEnv({
        G2BULK_API_KEY: " ",
        G2BULK_BASE_URL: "https://api.example.com/",
        G2BULK_WEBHOOK_SECRET: "webhook-secret",
        PAYMENT_PROVIDER: "instapay",
      })
    ).toThrow("G2BULK_API_KEY is required");
  });

  it("should default G2BULK_BASE_URL to https://api.g2bulk.com", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      G2BULK_WEBHOOK_SECRET: "webhook-secret",
      PAYMENT_PROVIDER: "instapay",
    });

    expect(env.g2bulkBaseUrl).toBe("https://api.g2bulk.com");
  });

  it("should strip trailing slash from G2BULK_BASE_URL", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      G2BULK_BASE_URL: "https://api.example.com/",
      G2BULK_WEBHOOK_SECRET: "webhook-secret",
      PAYMENT_PROVIDER: "instapay",
    });

    expect(env.g2bulkBaseUrl).toBe("https://api.example.com");
  });

  it("should default PAYMENT_PROVIDER to fake", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      G2BULK_BASE_URL: "https://api.example.com/",
      G2BULK_WEBHOOK_SECRET: "webhook-secret",
    });

    expect(env.paymentMode).toBe("fake");
  });

  it("should throw an error if PAYMENT_PROVIDER is unknown", () => {
    expect(() =>
      readEnv({
        G2BULK_API_KEY: "api-key",
        G2BULK_BASE_URL: "https://api.example.com/",
        G2BULK_WEBHOOK_SECRET: "webhook-secret",
        PAYMENT_PROVIDER: "unknown",
      })
    ).toThrow("PAYMENT_PROVIDER must be one of fake, instapay, crypto");
  });

  it("should default authSecret and adminPassword to empty when absent", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
    });

    expect(env.authSecret).toBe("");
    expect(env.adminPassword).toBe("");
  });

  it("should trim authSecret and adminPassword when present", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      AUTH_SECRET: " secret ",
      ADMIN_PASSWORD: " password ",
    });

    expect(env.authSecret).toBe("secret");
    expect(env.adminPassword).toBe("password");
  });

  it("should trim all values", () => {
    const env = readEnv({
      G2BULK_API_KEY: " api-key ",
      G2BULK_BASE_URL: " https://api.example.com/ ",
      G2BULK_WEBHOOK_SECRET: " webhook-secret ",
      PAYMENT_PROVIDER: " instapay ",
    });

    expect(env).toEqual({
      g2bulkApiKey: "api-key",
      g2bulkBaseUrl: "https://api.example.com",
      g2bulkWebhookSecret: "webhook-secret",
      paymentMode: "instapay",
      operationsMode: "sandbox",
      authSecret: "",
      adminPassword: "",
      jobsSecret: "",
      allowFakeFulfilment: false,
    });
  });

  it("should default OPERATIONS_MODE to sandbox", () => {
    const env = readEnv({ G2BULK_API_KEY: "api-key" });

    expect(env.operationsMode).toBe("sandbox");
  });

  it("should accept live and sandbox OPERATIONS_MODE", () => {
    expect(readEnv({ G2BULK_API_KEY: "api-key", OPERATIONS_MODE: "live" }).operationsMode).toBe("live");
    expect(readEnv({ G2BULK_API_KEY: "api-key", OPERATIONS_MODE: "sandbox" }).operationsMode).toBe("sandbox");
  });

  it("should throw an error if OPERATIONS_MODE is unknown", () => {
    expect(() =>
      readEnv({ G2BULK_API_KEY: "api-key", OPERATIONS_MODE: "unknown" })
    ).toThrow("OPERATIONS_MODE must be one of live, sandbox");
  });
});