/**
 * Validates and trims process environment variables, exposing typed configuration.
 * This is the only place environment keys are read.
 */
export type PaymentMode = "fake" | "instapay" | "crypto" | "paymob"

export type Env = {
  readonly g2bulkApiKey: string
  readonly g2bulkBaseUrl: string
  readonly g2bulkWebhookSecret: string
  readonly paymentMode: PaymentMode
  readonly authSecret: string
  readonly adminPassword: string
  readonly jobsSecret: string
  readonly allowFakeFulfilment: boolean
  readonly allowFakePayments: boolean
  // Required only when PAYMENT_PROVIDER="paymob", validated by the adapter, not at boot.
  readonly paymobApiKey: string
  readonly paymobPublicKey: string
  readonly paymobIntegrationIdCard: string
  readonly paymobIntegrationIdWallet: string
  readonly paymobHmacSecret: string
  readonly paymobSecretKey: string
  readonly paymobBaseUrl: string
  readonly appUrl: string
}

const PAYMENT_MODES: readonly PaymentMode[] = ["fake", "instapay", "crypto", "paymob"]

export function readEnv(source: Record<string, string | undefined>): Env {
  const g2bulkApiKey = source.G2BULK_API_KEY?.trim()
  if (!g2bulkApiKey) {
    throw new Error("G2BULK_API_KEY is required")
  }

  const baseUrl = source.G2BULK_BASE_URL?.trim() || "https://api.g2bulk.com"
  const g2bulkBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

  const g2bulkWebhookSecret = source.G2BULK_WEBHOOK_SECRET?.trim() || ""

  const paymentMode = (source.PAYMENT_PROVIDER?.trim().toLowerCase() || "fake") as PaymentMode
  if (!PAYMENT_MODES.includes(paymentMode)) {
    throw new Error("PAYMENT_PROVIDER must be one of fake, instapay, crypto, paymob")
  }

  const authSecret = source.AUTH_SECRET?.trim() || ""
  const adminPassword = source.ADMIN_PASSWORD?.trim() || ""
  const jobsSecret = source.JOBS_SECRET?.trim() || ""
  const allowFakeFulfilment = source.ALLOW_FAKE_FULFILMENT?.trim().toLowerCase() === "true"
  const allowFakePayments = source.ALLOW_FAKE_PAYMENTS?.trim().toLowerCase() === "true"

  // Required only when PAYMENT_PROVIDER="paymob", validated by the adapter, not at boot.
  const paymobApiKey = source.PAYMOB_API_KEY?.trim() || ""
  const paymobPublicKey = source.PAYMOB_PUBLIC_KEY?.trim() || ""
  const paymobIntegrationIdCard = source.PAYMOB_INTEGRATION_ID_CARD?.trim() || ""
  const paymobIntegrationIdWallet = source.PAYMOB_INTEGRATION_ID_WALLET?.trim() || ""
  const paymobHmacSecret = source.PAYMOB_HMAC_SECRET?.trim() || ""
  const paymobSecretKey = source.PAYMOB_SECRET_KEY?.trim() || ""
  let paymobBaseUrl = source.PAYMOB_BASE_URL?.trim() || "https://accept.paymob.com"
  if (paymobBaseUrl.endsWith("/")) {
    paymobBaseUrl = paymobBaseUrl.slice(0, -1)
  }
  if (paymobBaseUrl && !paymobBaseUrl.startsWith("http://") && !paymobBaseUrl.startsWith("https://")) {
    throw new Error("PAYMOB_BASE_URL must be an absolute http(s) URL")
  }
  let appUrl = source.APP_URL?.trim() || ""
  if (appUrl.endsWith("/")) {
    appUrl = appUrl.slice(0, -1)
  }
  if (appUrl && !appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
    throw new Error("APP_URL must be an absolute http(s) URL")
  }

  return {
    g2bulkApiKey,
    g2bulkBaseUrl,
    g2bulkWebhookSecret,
    paymentMode,
    authSecret,
    adminPassword,
    jobsSecret,
    allowFakeFulfilment,
    allowFakePayments,
    paymobApiKey,
    paymobPublicKey,
    paymobIntegrationIdCard,
    paymobIntegrationIdWallet,
    paymobHmacSecret,
    paymobSecretKey,
    paymobBaseUrl,
    appUrl,
  }
}