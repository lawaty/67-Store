/**
 * Validates and trims process environment variables, exposing typed configuration.
 * This is the only place environment keys are read.
 */
import type { OperationsMode } from "@/shared/operations-mode"
import { OPERATIONS_MODES } from "@/shared/operations-mode"

export type { OperationsMode }
export { OPERATIONS_MODES }

export type PaymentMode = "fake" | "instapay" | "crypto"

export type Env = {
  readonly g2bulkApiKey: string
  readonly g2bulkBaseUrl: string
  readonly g2bulkWebhookSecret: string
  readonly paymentMode: PaymentMode
  readonly operationsMode: OperationsMode
  readonly authSecret: string
  readonly adminPassword: string
  readonly jobsSecret: string
  readonly allowFakeFulfilment: boolean
}

const PAYMENT_MODES: readonly PaymentMode[] = ["fake", "instapay", "crypto"]

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
    throw new Error("PAYMENT_PROVIDER must be one of fake, instapay, crypto")
  }

  const operationsMode = (source.OPERATIONS_MODE?.trim().toLowerCase() || "sandbox") as OperationsMode
  if (!OPERATIONS_MODES.includes(operationsMode)) {
    throw new Error("OPERATIONS_MODE must be one of live, sandbox")
  }

  const authSecret = source.AUTH_SECRET?.trim() || ""
  const adminPassword = source.ADMIN_PASSWORD?.trim() || ""
  const jobsSecret = source.JOBS_SECRET?.trim() || ""
  const allowFakeFulfilment = source.ALLOW_FAKE_FULFILMENT?.trim().toLowerCase() === "true"

  return {
    g2bulkApiKey,
    g2bulkBaseUrl,
    g2bulkWebhookSecret,
    paymentMode,
    operationsMode,
    authSecret,
    adminPassword,
    jobsSecret,
    allowFakeFulfilment,
  }
}