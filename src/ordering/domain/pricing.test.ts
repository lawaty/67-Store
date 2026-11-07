import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { money } from "../../shared/money"
import { markup, sellPrice } from "./pricing"

describe("markup", () => {
  it("markup(2000).basisPoints is 2000", () => {
    expect(markup(2000).basisPoints).toBe(2000)
  })

  it("markup throws RangeError for -1, 1.5, and NaN", () => {
    expect(() => markup(-1)).toThrow(RangeError)
    expect(() => markup(1.5)).toThrow(RangeError)
    expect(() => markup(NaN)).toThrow(RangeError)
  })
})

describe("sellPrice", () => {
  it("sellPrice(money(10000, 'USD'), markup(2000)) equals money(12000, 'USD')", () => {
    expect(sellPrice(money(10000, "USD"), markup(2000))).toEqual(money(12000, "USD"))
  })

  it("sellPrice with markup(0) returns the cost unchanged", () => {
    expect(sellPrice(money(5000, "USD"), markup(0))).toEqual(money(5000, "USD"))
  })

  it("rounding is half up", () => {
    expect(sellPrice(money(1, "USD"), markup(5000))).toEqual(money(2, "USD"))
    expect(sellPrice(money(1, "USD"), markup(2500))).toEqual(money(1, "USD"))
    expect(sellPrice(money(3, "USD"), markup(5000))).toEqual(money(5, "USD"))
  })

  it("sellPrice preserves the currency, checked with EGP", () => {
    expect(sellPrice(money(10000, "EGP"), markup(2000))).toEqual(money(12000, "EGP"))
  })

  it("property: sellPrice never returns less than the cost for a non-negative markup", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000 }), fc.integer({ min: 0, max: 100000 }), fc.constantFrom("USD" as const, "EGP" as const), (minor, bp, currency) => {
        const cost = money(minor, currency)
        const result = sellPrice(cost, markup(bp))
        return result.minor >= cost.minor && result.currency === cost.currency
      })
    )
  })

  it("property: for any non-negative integer percent up to 200, sellPrice(cost, markup(percent * 100)) is at least cost", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000 }), fc.integer({ min: 0, max: 200 }), fc.constantFrom("USD" as const, "EGP" as const), (minor, percent, currency) => {
        const cost = money(minor, currency)
        const result = sellPrice(cost, markup(percent * 100))
        return result.minor >= cost.minor
      })
    )
  })
})
