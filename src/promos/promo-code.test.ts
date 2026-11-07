import { describe, it, expect } from "vitest"
import { money } from "../shared/money"
import { normalizeCode, isRedeemable, discountFor, PromoCode } from "./promo-code"

describe("normalizeCode", () => {
  const cases: Array<[string, string | "ERR"]> = [
    ["SAVE10", "SAVE10"],
    [" save10 ", "SAVE10"],
    ["save  10", "SAVE 10"],
    ["  MIXED   case  ", "MIXED CASE"],
    ["", "ERR"],
    ["   ", "ERR"],
    ["\t\n", "ERR"],
  ]
  it.each(cases)("normalizeCode(%j) -> %j", (input, expected) => {
    if (expected === "ERR") {
      expect(() => normalizeCode(input)).toThrow(RangeError)
    } else {
      expect(normalizeCode(input)).toBe(expected)
    }
  })
})

describe("isRedeemable", () => {
  const base: PromoCode = {
    id: "p1",
    code: "SAVE10",
    kind: "PERCENT",
    basisPoints: 1000,
    amountMinor: null,
    maxUses: 10,
    uses: 0,
    active: true,
    expiresAt: null,
  }
  it("redeemable when active, not expired, uses < maxUses", () => {
    expect(isRedeemable(base, "2026-01-01T00:00:00.000Z")).toBe(true)
  })
  it("not active -> false", () => {
    expect(isRedeemable({ ...base, active: false }, "2026-01-01T00:00:00.000Z")).toBe(false)
  })
  it("expired if expiresAt <= now (ISO comparison)", () => {
    expect(isRedeemable({ ...base, expiresAt: "2026-01-01T00:00:00.000Z" }, "2026-01-01T00:00:00.000Z")).toBe(false)
    expect(isRedeemable({ ...base, expiresAt: "2026-01-01T00:00:00.000Z" }, "2026-01-01T00:00:00.001Z")).toBe(false)
    expect(isRedeemable({ ...base, expiresAt: "2026-01-02T00:00:00.000Z" }, "2026-01-01T00:00:00.000Z")).toBe(true)
  })
  it("maxUses null means unlimited", () => {
    expect(isRedeemable({ ...base, maxUses: null, uses: 1000 }, "2026-01-01T00:00:00.000Z")).toBe(true)
  })
  it("exhausted when uses >= maxUses", () => {
    expect(isRedeemable({ ...base, maxUses: 5, uses: 5 }, "2026-01-01T00:00:00.000Z")).toBe(false)
    expect(isRedeemable({ ...base, maxUses: 5, uses: 4 }, "2026-01-01T00:00:00.000Z")).toBe(true)
  })
})

describe("discountFor", () => {
  it("PERCENT rounding half up like applyOffer", () => {
    // Math.floor((price.minor * bp + 5000) / 10000)
    const price = money(3, "USD")
    const promo: PromoCode = {
      id: "p1",
      code: "X",
      kind: "PERCENT",
      basisPoints: 5000,
      amountMinor: null,
      maxUses: null,
      uses: 0,
      active: true,
      expiresAt: null,
    }
    expect(discountFor({ price, cost: null, promo })).toEqual(money(2, "USD")) // floor((3*5000+5000)/10000)=floor(20000/10000)=2
    const price2 = money(1, "USD")
    expect(discountFor({ price: price2, cost: null, promo })).toEqual(money(1, "USD")) // floor((5000+5000)/10000)=1
  })

  it("FIXED takes min(amountMinor, price.minor)", () => {
    const promo: PromoCode = {
      id: "p1",
      code: "X",
      kind: "FIXED",
      basisPoints: null,
      amountMinor: 1500,
      maxUses: null,
      uses: 0,
      active: true,
      expiresAt: null,
    }
    expect(discountFor({ price: money(1000, "USD"), cost: null, promo })).toEqual(money(1000, "USD"))
    expect(discountFor({ price: money(2000, "USD"), cost: null, promo })).toEqual(money(1500, "USD"))
  })

  it("clamp to never sell below distributor cost", () => {
    const promo: PromoCode = {
      id: "p1",
      code: "X",
      kind: "PERCENT",
      basisPoints: 9000,
      amountMinor: null,
      maxUses: null,
      uses: 0,
      active: true,
      expiresAt: null,
    }
    // price 10000, cost 8000 -> discount limited to 10000-8000 = 2000
    expect(discountFor({ price: money(10000, "USD"), cost: money(8000, "USD"), promo })).toEqual(money(2000, "USD"))
  })

  it("clamp never below 0", () => {
    const promo: PromoCode = {
      id: "p1",
      code: "X",
      kind: "FIXED",
      basisPoints: null,
      amountMinor: 5000,
      maxUses: null,
      uses: 0,
      active: true,
      expiresAt: null,
    }
    // cost equals price
    expect(discountFor({ price: money(1000, "USD"), cost: money(1000, "USD"), promo })).toEqual(money(0, "USD"))
  })

  it("preserves currency from price", () => {
    const promo: PromoCode = {
      id: "p1",
      code: "X",
      kind: "FIXED",
      basisPoints: null,
      amountMinor: 100,
      maxUses: null,
      uses: 0,
      active: true,
      expiresAt: null,
    }
    expect(discountFor({ price: money(500, "EGP"), cost: null, promo }).currency).toBe("EGP")
  })

  it("throws RangeError for PERCENT without basisPoints in 1..10000", () => {
    const promo1: PromoCode = { id: "p1", code: "X", kind: "PERCENT", basisPoints: null, amountMinor: null, maxUses: null, uses: 0, active: true, expiresAt: null }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo1 })).toThrow(RangeError)
    const promo2: PromoCode = { ...promo1, basisPoints: 0 }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo2 })).toThrow(RangeError)
    const promo3: PromoCode = { ...promo1, basisPoints: 10001 }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo3 })).toThrow(RangeError)
  })

  it("throws RangeError for FIXED without a positive amountMinor", () => {
    const promo1: PromoCode = { id: "p1", code: "X", kind: "FIXED", basisPoints: null, amountMinor: null, maxUses: null, uses: 0, active: true, expiresAt: null }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo1 })).toThrow(RangeError)
    const promo2: PromoCode = { ...promo1, amountMinor: 0 }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo2 })).toThrow(RangeError)
    const promo3: PromoCode = { ...promo1, amountMinor: -10 }
    expect(() => discountFor({ price: money(1000, "USD"), cost: null, promo: promo3 })).toThrow(RangeError)
  })
})
