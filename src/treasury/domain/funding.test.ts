import { describe, expect, it } from "vitest"
import { funding, inferredEgpPerUsdtMinor } from "./funding"

describe("funding", () => {
  it("returns a frozen copy", () => {
    const input = {
      id: "lot-1",
      egpPaidMinor: 2500000,
      usdtMilli: 5000000,
      createdAt: "2026-01-01T00:00:00Z",
    }
    const result = funding(input)
    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it("trims id and createdAt", () => {
    const result = funding({
      id: "  lot-1  ",
      egpPaidMinor: 100,
      usdtMilli: 1000,
      createdAt: "  now  ",
    })
    expect(result.id).toBe("lot-1")
    expect(result.createdAt).toBe("now")
  })

  it("throws RangeError for empty id or createdAt", () => {
    const base = {
      egpPaidMinor: 100,
      usdtMilli: 1000,
      createdAt: "now",
    }
    expect(() => funding({ ...base, id: "   " })).toThrow(RangeError)
    expect(() => funding({ ...base, id: "x", createdAt: "   " })).toThrow(RangeError)
  })

  it("throws RangeError for non-positive egpPaidMinor/usdtMilli", () => {
    const base = {
      id: "x",
      egpPaidMinor: 100,
      usdtMilli: 1000,
      createdAt: "now",
    }
    expect(() => funding({ ...base, egpPaidMinor: 0 })).toThrow(RangeError)
    expect(() => funding({ ...base, egpPaidMinor: -1 })).toThrow(RangeError)
    expect(() => funding({ ...base, egpPaidMinor: 1.5 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMilli: 0 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMilli: -1 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMilli: 1.5 })).toThrow(RangeError)
  })
})

describe("inferredEgpPerUsdtMinor", () => {
  it("returns egpPaid * 1000 / usdtMilli, rounded half-up", () => {
    expect(inferredEgpPerUsdtMinor(250000, 50000)).toBe(5000)
    expect(inferredEgpPerUsdtMinor(105, 1000)).toBe(105)
    expect(inferredEgpPerUsdtMinor(1, 1000)).toBe(1)
    expect(inferredEgpPerUsdtMinor(150, 1000)).toBe(150)
    expect(inferredEgpPerUsdtMinor(1, 30)).toBe(33) // 1000/30 = 33.33 -> 33
    expect(inferredEgpPerUsdtMinor(2, 30)).toBe(67) // 2000/30 = 66.66 -> 67
  })

  it("rejects non-safe or invalid amounts", () => {
    expect(() => inferredEgpPerUsdtMinor(-1, 1000)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(1.5, 1000)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, 0)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, -10)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, 1.5)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(Number.MAX_SAFE_INTEGER, 10)).toThrow(RangeError)
  })
})
