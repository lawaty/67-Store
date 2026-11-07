/**
 * Derives and verifies admin session tokens via HMAC-SHA256 of the admin
 * password, using timing-safe comparison to prevent token guessing.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { ADMIN_COOKIE } from "@/shared/session-cookie"

export { ADMIN_COOKIE }

export function adminToken(password: string): string {
  if (password === "") {
    throw new Error("ADMIN_PASSWORD is required")
  }
  return createHmac("sha256", password).update("admin-session").digest("hex")
}

export function isAdminToken(token: string | undefined, password: string): boolean {
  if (token === undefined || token === "" || password === "") {
    return false
  }
  const expected = adminToken(password)
  if (token.length !== expected.length) {
    return false
  }
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}
