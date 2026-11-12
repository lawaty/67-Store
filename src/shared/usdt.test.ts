import { describe, expect, test } from "vitest"
import {
  USDT_MILLI_PER_USD_MINOR,
  USDT_MILLI_PER_USDT,
  usdMinorFloorFromUsdtMilli,
  usdtMilliFromUsdMinor,
} from "./usdt"

describe("usdt constants", () => {
  test("constants are 1000 and 10", () => {
    expect(USDT_MILLI_PER_USDT).toBe(1000)
    expect(USDT_MILLI_PER_USD_MINOR).toBe(10)
  })
})

describe("usdtMilliFromUsdMinor", () => {
  test("converts usd minor units to milli-usdt", () => {
    expect(usdtMilliFromUsdMinor(0)).toBe(0)
    expect(usdtMilliFromUsdMinor(1)).toBe(10)
    expect(usdtMilliFromUsdMinor(123)).toBe(1230)
    expect(usdtMilliFromUsdMinor(99999999)).toBe(999999990)
  })
})

describe("usdMinorFloorFromUsdtMilli", () => {
  test("floors milli-usdt to usd minor units", () => {
    expect(usdMinorFloorFromUsdtMilli(0)).toBe(0)
    expect(usdMinorFloorFromUsdtMilli(9)).toBe(0)
    expect(usdMinorFloorFromUsdtMilli(10)).toBe(1)
    expect(usdMinorFloorFromUsdtMilli(1234)).toBe(123)
    expect(usdMinorFloorFromUsdtMilli(1239)).toBe(123)
  })
})

describe("input validation", () => {
  const invalidValues = [-1, -0.1, 0.5, NaN, Infinity, -Infinity]

  test("usdtMilliFromUsdMinor throws RangeError on negative, non-integer, NaN, Infinity", () => {
    for (const value of invalidValues) {
      expect(() => usdtMilliFromUsdMinor(value)).toThrow(RangeError)
    }
  })

  test("usdMinorFloorFromUsdtMilli throws RangeError on negative, non-integer, NaN, Infinity", () => {
    for (const value of invalidValues) {
      expect(() => usdMinorFloorFromUsdtMilli(value)).toThrow(RangeError)
    }
  })
})

describe("round-trip", () => {
  test("usdMinorFloorFromUsdtMilli(usdtMilliFromUsdMinor(n)) === n for several cent values", () => {
    for (const n of [0, 1, 2, 9, 10, 99, 100, 123, 999, 1234567, 99999999]) {
      expect(usdMinorFloorFromUsdtMilli(usdtMilliFromUsdMinor(n))).toBe(n)
    }
  })
})
