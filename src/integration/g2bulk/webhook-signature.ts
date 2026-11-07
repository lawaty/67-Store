/**
 * Verifies G2Bulk webhook HMAC signatures in constant time, enforcing timestamp
 * freshness and accepting Stripe-style v1 signature candidates.
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export type VerifyInput = {
  secret: string
  webhookId: string
  timestamp: string
  body: string
  signature: string
  now?: number
}

export function verifyWebhookSignature(input: VerifyInput): boolean {
  const now = input.now === undefined ? Date.now() : input.now
  if (
    input.secret === "" ||
    input.webhookId === "" ||
    input.timestamp === "" ||
    input.body === "" ||
    input.signature === ""
  ) {
    return false
  }
  const ts = Number(input.timestamp)
  if (!Number.isFinite(ts)) {
    return false
  }
  const diffSeconds = Math.abs(now / 1000 - ts)
  if (diffSeconds > 300) {
    return false
  }
  const content = `${input.webhookId}.${input.timestamp}.${input.body}`
  let secret = input.secret
  if (secret.startsWith("whsec_")) {
    secret = secret.slice("whsec_".length)
  }
  let key: Buffer
  try {
    key = Buffer.from(secret, "base64")
  } catch {
    return false
  }
  const expected = createHmac("sha256", key).update(content).digest()

  // Collect every candidate signature. Stripe-style headers may carry several
  // comma/space separated `v1,<sig>` entries; a bare signature (no prefix) is
  // also accepted for backwards compatibility.
  const candidates: string[] = []
  const re = /v1,([A-Za-z0-9+\/=_-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input.signature)) !== null) {
    candidates.push(m[1])
  }
  if (candidates.length === 0) {
    candidates.push(input.signature)
  }

  for (const cand of candidates) {
    let provided: Buffer
    try {
      provided = Buffer.from(cand, "base64")
    } catch {
      continue
    }
    if (provided.length !== expected.length) {
      continue
    }
    try {
      if (timingSafeEqual(provided, expected)) {
        return true
      }
    } catch {
      // ignore
    }
  }
  return false
}
