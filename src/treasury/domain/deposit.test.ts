import { describe, expect, it } from "vitest"
import { deposit, coinsForDeposit, fxResultEgpMinor } from "./deposit"

describe("deposit", () => {
  it("coinsForDeposit exact division", () => {
    expect(coinsForDeposit(1000, 10)).toBe(100)
  })

  it("remainder rounds down", () => {
    expect(coinsForDeposit(1005, 10)).toBe(100)
  })

  it("USD deposit of 200 minor at rate 1 issues 200 coins", () => {
    expect(coinsForDeposit(200, 1)).toBe(200)
  })

  it("zero coins for amount below one rate", () => {
    expect(coinsForDeposit(5, 10)).toBe(0)
  })

  it("fxResult positive and negative", () => {
    expect(fxResultEgpMinor({ coins: 10, wacEgpMinor: 5, egpValueMinor: 100 })).toBe(50)
    expect(fxResultEgpMinor({ coins: 10, wacEgpMinor: 15, egpValueMinor: 100 })).toBe(-50)
  })

  it("deposit validates and freezes", () => {
    const base = { id: "d1", clientId: "c1", currency: "EGP" as const, amountMinor: 100, rateMinor: 10, coins: 10, wacEgpMinor: 5, egpValueMinor: 100, createdAt: "now" }
    const r = deposit(base)
    expect(r).not.toBe(base)
    expect(Object.isFrozen(r)).toBe(true)
    expect(() => deposit({ ...base, id: "   " })).toThrow(RangeError)
    expect(() => deposit({ ...base, clientId: "   " })).toThrow(RangeError)
    expect(() => deposit({ ...base, createdAt: "   " })).toThrow(RangeError)
    expect(() => deposit({ ...base, amountMinor: 0 })).toThrow(RangeError)
    expect(() => deposit({ ...base, rateMinor: 0 })).toThrow(RangeError)
    expect(() => deposit({ ...base, coins: 0 })).toThrow(RangeError)
    expect(() => deposit({ ...base, wacEgpMinor: -1 })).toThrow(RangeError)
    expect(() => deposit({ ...base, egpValueMinor: -1 })).toThrow(RangeError)
  })

  it("coinsForDeposit throws on bad inputs", () => {
    expect(() => coinsForDeposit(0, 10)).toThrow(RangeError)
    expect(() => coinsForDeposit(10, 0)).toThrow(RangeError)
    expect(() => coinsForDeposit(10.5, 10)).toThrow(RangeError)
  })

  it("fxResult throws if result not safe integer", () => {
    expect(() => fxResultEgpMinor({ coins: Number.MAX_SAFE_INTEGER, wacEgpMinor: 2, egpValueMinor: 0 })).toThrow(RangeError)
  })
})
