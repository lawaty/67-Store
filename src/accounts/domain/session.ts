/**
 * Signs and verifies account session tokens with HMAC-SHA256.
 * A valid token decodes to account/client ids and is rejected when expired or tampered.
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export type Session = { readonly accountId: string; readonly clientId: string; readonly expiresAt: number }

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64urlDecode(str: string): Buffer | null {
  try {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/")
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
    return Buffer.from(padded + pad, "base64")
  } catch {
    return null
  }
}

export function signSession(session: Session, secret: string): string {
  if (!secret) {
    throw new Error("AUTH_SECRET is required")
  }
  const payload = base64url(JSON.stringify(session))
  const hmac = createHmac("sha256", secret).update(payload).digest()
  const sig = base64url(hmac)
  return `${payload}.${sig}`
}

export function verifySession(token: string, secret: string, now?: number): Session | null {
  if (!secret) {
    throw new Error("AUTH_SECRET is required")
  }
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts
  if (!payloadB64 || !sigB64) return null

  const payloadBuf = base64urlDecode(payloadB64)
  const sigBuf = base64urlDecode(sigB64)
  if (!payloadBuf || !sigBuf) return null

  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest()
  if (sigBuf.length !== expectedSig.length) return null
  try {
    if (!timingSafeEqual(sigBuf, expectedSig)) return null
  } catch {
    return null
  }

  let session: Session
  try {
    session = JSON.parse(payloadBuf.toString("utf8")) as Session
  } catch {
    return null
  }
  if (
    !session ||
    typeof session.accountId !== "string" ||
    typeof session.clientId !== "string" ||
    typeof session.expiresAt !== "number"
  ) {
    return null
  }

  const current = now ?? Date.now()
  if (session.expiresAt <= current) return null

  return session
}