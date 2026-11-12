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
      authSecret: "",
      adminPassword: "",
      jobsSecret: "",
      allowFakeFulfilment: false,
      allowFakePayments: false,
      paymobApiKey: "",
      paymobPublicKey: "",
      paymobIntegrationIdCard: "",
      paymobIntegrationIdWallet: "",
      paymobHmacSecret: "",
      paymobSecretKey: "",
      paymobBaseUrl: "https://accept.paymob.com",
      appUrl: "",
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
    ).toThrow("PAYMENT_PROVIDER must be one of fake, instapay, crypto, paymob");
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
      authSecret: "",
      adminPassword: "",
      jobsSecret: "",
      allowFakeFulfilment: false,
      allowFakePayments: false,
      paymobApiKey: "",
      paymobPublicKey: "",
      paymobIntegrationIdCard: "",
      paymobIntegrationIdWallet: "",
      paymobHmacSecret: "",
      paymobSecretKey: "",
      paymobBaseUrl: "https://accept.paymob.com",
      appUrl: "",
    });
  });

  it("should parse ALLOW_FAKE_PAYMENTS", () => {
    expect(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "true" }).allowFakePayments).toBe(true);
    expect(readEnv({ G2BULK_API_KEY: "k" }).allowFakePayments).toBe(false);
    expect(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "false" }).allowFakePayments).toBe(false);
  });

  it("should accept paymob as PAYMENT_PROVIDER", () => {
    const env = readEnv({ G2BULK_API_KEY: "api-key", PAYMENT_PROVIDER: "paymob" });
    expect(env.paymentMode).toBe("paymob");
  });

  it("should normalise uppercase PAYMOB to paymob", () => {
    const env = readEnv({ G2BULK_API_KEY: "api-key", PAYMENT_PROVIDER: "PAYMOB" });
    expect(env.paymentMode).toBe("paymob");
  });

  it("should strip trailing slash from APP_URL", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      APP_URL: "https://67-store.online/",
    });
    expect(env.appUrl).toBe("https://67-store.online");
  });

  it("should default APP_URL to empty when absent or blank", () => {
    expect(readEnv({ G2BULK_API_KEY: "api-key" }).appUrl).toBe("");
    expect(readEnv({ G2BULK_API_KEY: "api-key", APP_URL: "" }).appUrl).toBe("");
  });

  it("should throw if APP_URL is non-empty and not absolute http(s)", () => {
    expect(() =>
      readEnv({ G2BULK_API_KEY: "api-key", APP_URL: "67-store.online" })
    ).toThrow("APP_URL must be an absolute http(s) URL");
  });

  it("should default all Paymob fields to empty when absent", () => {
    const env = readEnv({ G2BULK_API_KEY: "api-key" });
    expect(env.paymobApiKey).toBe("");
    expect(env.paymobPublicKey).toBe("");
    expect(env.paymobIntegrationIdCard).toBe("");
    expect(env.paymobIntegrationIdWallet).toBe("");
    expect(env.paymobHmacSecret).toBe("");
    expect(env.paymobSecretKey).toBe("");
  });

  it("should read all Paymob fields from the env when present", () => {
    const env = readEnv({
      G2BULK_API_KEY: "api-key",
      PAYMOB_API_KEY: "api",
      PAYMOB_PUBLIC_KEY: "pub",
      PAYMOB_INTEGRATION_ID_CARD: "card",
      PAYMOB_INTEGRATION_ID_WALLET: "wallet",
      PAYMOB_HMAC_SECRET: "hmac",
      PAYMOB_SECRET_KEY: "secret",
    });
    expect(env.paymobApiKey).toBe("api");
    expect(env.paymobPublicKey).toBe("pub");
    expect(env.paymobIntegrationIdCard).toBe("card");
    expect(env.paymobIntegrationIdWallet).toBe("wallet");
    expect(env.paymobHmacSecret).toBe("hmac");
    expect(env.paymobSecretKey).toBe("secret");
  });

  it("should read PAYMOB_SECRET_KEY when present and default to empty string", () => {
    expect(readEnv({ G2BULK_API_KEY: "api-key" }).paymobSecretKey).toBe("");
    expect(readEnv({ G2BULK_API_KEY: "api-key", PAYMOB_SECRET_KEY: " secret " }).paymobSecretKey).toBe("secret");
  });

  it("should default PAYMOB_BASE_URL to https://accept.paymob.com", () => {
    expect(readEnv({ G2BULK_API_KEY: "api-key" }).paymobBaseUrl).toBe("https://accept.paymob.com");
  });

  it('should strip trailing slash from PAYMOB_BASE_URL "https://accept.paymob.com/"', () => {
    expect(
      readEnv({ G2BULK_API_KEY: "api-key", PAYMOB_BASE_URL: "https://accept.paymob.com/" }).paymobBaseUrl
    ).toBe("https://accept.paymob.com");
  });

  it('should throw if PAYMOB_BASE_URL="accept.paymob.com" with the new message', () => {
    expect(() =>
      readEnv({ G2BULK_API_KEY: "api-key", PAYMOB_BASE_URL: "accept.paymob.com" })
    ).toThrow("PAYMOB_BASE_URL must be an absolute http(s) URL");
  });
});