import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("password", () => {
  it("a hash has the form hex:hex", async () => {
    const h = await hashPassword("password123")
    expect(h).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
  })

  it("verifying the right password is true", async () => {
    const h = await hashPassword("password123")
    expect(await verifyPassword("password123", h)).toBe(true)
  })

  it("verifying a wrong password is false", async () => {
    const h = await hashPassword("password123")
    expect(await verifyPassword("wrongpassword", h)).toBe(false)
  })

  it("the same password hashed twice gives different values", async () => {
    const a = await hashPassword("password123")
    const b = await hashPassword("password123")
    expect(a).not.toBe(b)
  })

  it("a password shorter than 8 characters throws RangeError", async () => {
    await expect(hashPassword("short")).rejects.toBeInstanceOf(RangeError)
  })

  it("verifyPassword returns false for malformed stored values without throwing", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false)
    expect(await verifyPassword("anything", "")).toBe(false)
  })
})