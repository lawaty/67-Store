import { describe, expect, it } from "vitest"
import { signSession, verifySession } from "./session"

describe("session", () => {
  it("a signed session round-trips", () => {
    const s = { accountId: "a1", clientId: "c1", expiresAt: Date.now() + 10000 }
    const token = signSession(s, "secret")
    expect(verifySession(token, "secret")).toEqual(s)
  })

  it("a tampered payload returns null", () => {
    const s = { accountId: "a1", clientId: "c1", expiresAt: Date.now() + 10000 }
    const token = signSession(s, "secret")
    const [payload, sig] = token.split(".")
    const tampered = payload.slice(0, -1) + (payload.endsWith("a") ? "b" : "a")
    expect(verifySession(`${tampered}.${sig}`, "secret")).toBeNull()
  })

  it("a token signed with a different secret returns null", () => {
    const s = { accountId: "a1", clientId: "c1", expiresAt: Date.now() + 10000 }
    const token = signSession(s, "secret1")
    expect(verifySession(token, "secret2")).toBeNull()
  })

  it("an expired session returns null", () => {
    const s = { accountId: "a1", clientId: "c1", expiresAt: Date.now() - 1000 }
    const token = signSession(s, "secret")
    expect(verifySession(token, "secret")).toBeNull()
  })

  it("a session expiring exactly at now returns null", () => {
    const now = Date.now()
    const s = { accountId: "a1", clientId: "c1", expiresAt: now }
    const token = signSession(s, "secret")
    expect(verifySession(token, "secret", now)).toBeNull()
  })

  it("a malformed token returns null without throwing", () => {
    expect(verifySession("abc", "secret")).toBeNull()
    expect(verifySession("", "secret")).toBeNull()
  })

  it("an empty secret throws from both functions", () => {
    const s = { accountId: "a1", clientId: "c1", expiresAt: Date.now() + 10000 }
    expect(() => signSession(s, "")).toThrow("AUTH_SECRET is required")
    expect(() => verifySession("abc", "")).toThrow("AUTH_SECRET is required")
  })
})