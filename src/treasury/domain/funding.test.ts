import { describe, expect, it } from "vitest"
import { funding, inferredEgpPerUsdtMinor } from "./funding"

describe("funding", () => {
  it("returns a frozen copy", () => {
    const input = {
      id: "lot-1",
      egpPaidMinor: 2500000,
      usdtMinor: 50000,
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
      usdtMinor: 10,
      createdAt: "  now  ",
    })
    expect(result.id).toBe("lot-1")
    expect(result.createdAt).toBe("now")
  })

  it("throws RangeError for empty id or createdAt", () => {
    const base = {
      egpPaidMinor: 100,
      usdtMinor: 10,
      createdAt: "now",
    }
    expect(() => funding({ ...base, id: "   " })).toThrow(RangeError)
    expect(() => funding({ ...base, id: "x", createdAt: "   " })).toThrow(RangeError)
  })

  it("throws RangeError for non-positive egpPaidMinor/usdtMinor", () => {
    const base = {
      id: "x",
      egpPaidMinor: 100,
      usdtMinor: 10,
      createdAt: "now",
    }
    expect(() => funding({ ...base, egpPaidMinor: 0 })).toThrow(RangeError)
    expect(() => funding({ ...base, egpPaidMinor: -1 })).toThrow(RangeError)
    expect(() => funding({ ...base, egpPaidMinor: 1.5 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMinor: 0 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMinor: -1 })).toThrow(RangeError)
    expect(() => funding({ ...base, usdtMinor: 1.5 })).toThrow(RangeError)
  })
})

describe("inferredEgpPerUsdtMinor", () => {
  it("returns egpPaid * 100 / usdt, rounded half-up", () => {
    expect(inferredEgpPerUsdtMinor(250000, 5000)).toBe(5000)
    expect(inferredEgpPerUsdtMinor(105, 100)).toBe(105)
    expect(inferredEgpPerUsdtMinor(1, 100)).toBe(1)
    expect(inferredEgpPerUsdtMinor(150, 100)).toBe(150)
    expect(inferredEgpPerUsdtMinor(1, 3)).toBe(33) // 100/3 = 33.33 -> 33
    expect(inferredEgpPerUsdtMinor(2, 3)).toBe(67) // 200/3 = 66.66 -> 67
  })

  it("rejects non-safe or invalid amounts", () => {
    expect(() => inferredEgpPerUsdtMinor(-1, 100)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(1.5, 100)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, 0)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, -1)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(100, 1.5)).toThrow(RangeError)
    expect(() => inferredEgpPerUsdtMinor(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError)
  })
})
