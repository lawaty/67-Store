import { describe, expect, it } from "vitest"
import {
  MIN_OFFER_TRADABLE_USDT,
  parseTradableQuantity,
  parsePriceToMinor,
  extractTradeMethodNames,
  hasPaymentMethod,
  isEligibleAd,
  isEligibleVodafoneCash,
} from "./eligibility"

function ad(overrides: {
  privilegeType?: unknown
  price?: unknown
  tradableQuantity?: unknown
  tradeMethods?: unknown
} = {}) {
  const hasPriv = Object.prototype.hasOwnProperty.call(overrides, "privilegeType")
  const adv: Record<string, unknown> = {}
  if (Object.prototype.hasOwnProperty.call(overrides, "price")) adv.price = overrides.price
  else adv.price = "50.00"
  if (Object.prototype.hasOwnProperty.call(overrides, "tradableQuantity")) adv.tradableQuantity = overrides.tradableQuantity
  else adv.tradableQuantity = "200.00"
  if (Object.prototype.hasOwnProperty.call(overrides, "tradeMethods")) adv.tradeMethods = overrides.tradeMethods
  else adv.tradeMethods = [{ tradeMethodName: "Bank Transfer" }]
  const item: Record<string, unknown> = { adv }
  if (hasPriv) item.privilegeType = overrides.privilegeType
  return item
}

describe("binance-p2p eligibility", () => {
  it("MIN_OFFER_TRADABLE_USDT is 200", () => {
    expect(MIN_OFFER_TRADABLE_USDT).toBe(200)
  })

  describe("parseTradableQuantity", () => {
    it("parses numeric strings", () => {
      expect(parseTradableQuantity("200.00")).toBe(200)
      expect(parseTradableQuantity("199.99")).toBeCloseTo(199.99)
      expect(parseTradableQuantity("1000")).toBe(1000)
    })
    it("returns null for invalid values", () => {
      expect(parseTradableQuantity(undefined)).toBeNull()
      expect(parseTradableQuantity(null)).toBeNull()
      expect(parseTradableQuantity(200)).toBeNull()
      expect(parseTradableQuantity("nope")).toBeNull()
      expect(parseTradableQuantity("")).toBeNull()
      expect(parseTradableQuantity(" 200")).toBeNull()
    })
  })

  describe("parsePriceToMinor", () => {
    it("parses valid decimal strings to minor units", () => {
      expect(parsePriceToMinor("48.75")).toBe(4875)
      expect(parsePriceToMinor("48.7")).toBe(4870)
      expect(parsePriceToMinor("48")).toBe(4800)
      expect(parsePriceToMinor("0.50")).toBe(50)
    })
    it("rejects bad formats, zero, negative, spaces, leading zeros, >2 decimals", () => {
      expect(parsePriceToMinor("0")).toBeNull()
      expect(parsePriceToMinor("0.00")).toBeNull()
      expect(parsePriceToMinor("-1")).toBeNull()
      expect(parsePriceToMinor("abc")).toBeNull()
      expect(parsePriceToMinor("48.123")).toBeNull()
      expect(parsePriceToMinor(" 48.75")).toBeNull()
      expect(parsePriceToMinor("0123")).toBeNull()
      expect(parsePriceToMinor(48.75)).toBeNull()
      expect(parsePriceToMinor(null)).toBeNull()
    })
  })

  describe("extractTradeMethodNames", () => {
    it("extracts string trade method names", () => {
      expect(extractTradeMethodNames(ad({ tradeMethods: [{ tradeMethodName: "Bank Transfer" }, { tradeMethodName: "Vodafone Cash" }] }))).toEqual(["Bank Transfer", "Vodafone Cash"])
    })
    it("ignores malformed entries", () => {
      expect(extractTradeMethodNames(ad({ tradeMethods: [{ nope: "x" }, null, "bad", {}, { tradeMethodName: "Bank" }] }))).toEqual(["Bank"])
      expect(extractTradeMethodNames(ad({ tradeMethods: "nope" }))).toEqual([])
      expect(extractTradeMethodNames({ adv: {} })).toEqual([])
    })
  })

  describe("hasPaymentMethod", () => {
    it("matches case-insensitively by substring", () => {
      expect(hasPaymentMethod(ad({ tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] }), "vodafone")).toBe(true)
      expect(hasPaymentMethod(ad({ tradeMethods: [{ tradeMethodName: "VODAFONE cash" }] }), "vodafone")).toBe(true)
      expect(hasPaymentMethod(ad({ tradeMethods: [{ tradeMethodName: "Bank Transfer" }] }), "bank")).toBe(true)
      expect(hasPaymentMethod(ad({ tradeMethods: [{ tradeMethodName: "Instapay" }] }), "vodafone")).toBe(false)
    })
  })

  describe("isEligibleAd", () => {
    it("accepts a normal ad with null/absent privilegeType, >=200, valid price", () => {
      expect(isEligibleAd(ad())).toBe(true)
      expect(isEligibleAd(ad({ privilegeType: null }))).toBe(true)
      expect(isEligibleAd(ad({ tradableQuantity: "200.00" }))).toBe(true)
      expect(isEligibleAd(ad({ tradableQuantity: "1000" }))).toBe(true)
    })
    it("rejects promoted ads (privilegeType set)", () => {
      expect(isEligibleAd(ad({ privilegeType: 1 }))).toBe(false)
      expect(isEligibleAd(ad({ privilegeType: 0 }))).toBe(false)
      expect(isEligibleAd(ad({ privilegeType: "1" }))).toBe(false)
    })
    it("rejects under-200 tradable quantity", () => {
      expect(isEligibleAd(ad({ tradableQuantity: "199.99" }))).toBe(false)
      expect(isEligibleAd(ad({ tradableQuantity: "0" }))).toBe(false)
      expect(isEligibleAd(ad({ tradableQuantity: undefined }))).toBe(false)
      expect(isEligibleAd(ad({ tradableQuantity: "nope" }))).toBe(false)
    })
    it("rejects bad price", () => {
      expect(isEligibleAd(ad({ price: "abc" }))).toBe(false)
      expect(isEligibleAd(ad({ price: "0" }))).toBe(false)
      expect(isEligibleAd(ad({ price: undefined }))).toBe(false)
      expect(isEligibleAd(ad({ price: 50 }))).toBe(false)
    })
  })

  describe("isEligibleVodafoneCash", () => {
    it("requires base eligibility and a vodafone method", () => {
      expect(isEligibleVodafoneCash(ad({ tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] }))).toBe(true)
      expect(isEligibleVodafoneCash(ad({ tradeMethods: [{ tradeMethodName: "vodafone" }] }))).toBe(true)
    })
    it("rejects bank-only or no vodafone method", () => {
      expect(isEligibleVodafoneCash(ad({ tradeMethods: [{ tradeMethodName: "Bank Transfer" }] }))).toBe(false)
      expect(isEligibleVodafoneCash(ad({ tradeMethods: [{ tradeMethodName: "Instapay" }] }))).toBe(false)
      expect(isEligibleVodafoneCash(ad({ tradeMethods: [] }))).toBe(false)
    })
    it("rejects ineligible vodafone ads", () => {
      expect(isEligibleVodafoneCash(ad({ privilegeType: 1, tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] }))).toBe(false)
      expect(isEligibleVodafoneCash(ad({ tradableQuantity: "100", tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] }))).toBe(false)
    })
  })
})
