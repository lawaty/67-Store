import { describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"
import { paymobHmacPayload, verifyPaymobHmac } from "./webhook-signature"

const secret = "test-paymob-hmac-secret"

const transaction: Record<string, unknown> = {
  amount_cents: 10000,
  created_at: "2026-11-11T10:00:00.000000Z",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  id: 123456,
  integration_id: 99999,
  is_3d_secure: true,
  is_auth: false,
  is_capture: true,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 777001 },
  owner: 42,
  pending: false,
  source_data: { pan: "512345", sub_type: "MasterCard", type: "card" },
  success: true,
}

function sign(t: Record<string, unknown>, s = secret): string {
  return createHmac("sha512", s).update(paymobHmacPayload(t)).digest("hex")
}

describe("paymobHmacPayload", () => {
  it("concatenates resolved values in the documented order with no separators", () => {
    const expected =
      "10000" +
      "2026-11-11T10:00:00.000000Z" +
      "EGP" +
      "false" +
      "false" +
      "123456" +
      "99999" +
      "true" +
      "false" +
      "true" +
      "false" +
      "true" +
      "false" +
      "777001" +
      "42" +
      "false" +
      "512345" +
      "MasterCard" +
      "card" +
      "true"
    expect(paymobHmacPayload(transaction)).toBe(expected)
  })

  it("uses empty string for missing/null fields and lowercases booleans", () => {
    const sparse: Record<string, unknown> = {
      amount_cents: 1,
      currency: "EGP",
      error_occured: null,
      id: undefined,
      order: {},
      source_data: null,
      success: false,
    }
    expect(paymobHmacPayload(sparse)).toBe("1" + "" + "EGP" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "false")
  })
})

describe("verifyPaymobHmac", () => {
  it("returns true for a valid signature", () => {
    expect(verifyPaymobHmac({ hmac: sign(transaction), transaction, secret })).toBe(true)
  })

  it("returns false for a tampered payload", () => {
    const tampered = { ...transaction, amount_cents: 99999 }
    expect(verifyPaymobHmac({ hmac: sign(transaction), transaction: tampered, secret })).toBe(false)
  })

  it("returns false for a wrong secret", () => {
    expect(verifyPaymobHmac({ hmac: sign(transaction), transaction, secret: "wrong" })).toBe(false)
  })

  it("returns false for wrong-length hex", () => {
    expect(verifyPaymobHmac({ hmac: "abcd", transaction, secret })).toBe(false)
  })

  it("returns false for empty inputs", () => {
    expect(verifyPaymobHmac({ hmac: "", transaction, secret })).toBe(false)
    expect(verifyPaymobHmac({ hmac: sign(transaction), transaction, secret: "" })).toBe(false)
  })
})
