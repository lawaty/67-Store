/**
 * Verifies Paymob transaction callback HMAC (SHA-512, hex) in constant time.
 * Source of truth for field order: Paymob Accept dashboard → HMAC calculation settings;
 * a mismatch there is the first thing to check when a real callback is rejected.
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export const PAYMOB_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const

function resolve(transaction: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".")
  let current: unknown = transaction
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  return String(value)
}

export function paymobHmacPayload(transaction: Record<string, unknown>): string {
  let payload = ""
  for (const field of PAYMOB_HMAC_FIELDS) {
    payload += stringify(resolve(transaction, field))
  }
  return payload
}

export function verifyPaymobHmac(input: {
  hmac: string
  transaction: Record<string, unknown>
  secret: string
}): boolean {
  if (input.secret === "" || input.hmac === "") return false
  const payload = paymobHmacPayload(input.transaction)
  if (payload === "") return false

  const expected = createHmac("sha512", input.secret).update(payload).digest("hex")
  const provided = input.hmac.trim().toLowerCase()
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"))
  } catch {
    return false
  }
}
