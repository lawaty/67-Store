import { describe, expect, it } from "vitest"
import { idempotencyKey } from "./idempotency"

describe("idempotencyKey", () => {
  it("matches UUID v4 shape", () => {
    expect(idempotencyKey("ord123")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it("is deterministic", () => {
    expect(idempotencyKey("ord123")).toBe(idempotencyKey("ord123"))
  })
  it("differs for different ids", () => {
    expect(idempotencyKey("ord123")).not.toBe(idempotencyKey("ord456"))
  })
})
