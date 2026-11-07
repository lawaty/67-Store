import { describe, expect, test } from "vitest"
import fc from "fast-check"
import { add, equals, majorToMinor, money, subtract } from "./money"

describe("money", () => {
  test("money(100, \"USD\") returns { minor: 100, currency: \"USD\" }", () => {
    expect(money(100, "USD")).toEqual({ minor: 100, currency: "USD" })
  })

  test("money throws RangeError for 1.5, NaN, and Infinity", () => {
    expect(() => money(1.5, "USD")).toThrow(RangeError)
    expect(() => money(NaN, "USD")).toThrow(RangeError)
    expect(() => money(Infinity, "USD")).toThrow(RangeError)
  })

  test("add sums two USD amounts", () => {
    const result = add(money(100, "USD"), money(50, "USD"))
    expect(result).toEqual({ minor: 150, currency: "USD" })
  })

  test("add throws TypeError when adding USD to EGP", () => {
    expect(() => add(money(100, "USD"), money(50, "EGP"))).toThrow(TypeError)
  })

  test("subtract returns the difference", () => {
    const result = subtract(money(100, "USD"), money(30, "USD"))
    expect(result).toEqual({ minor: 70, currency: "USD" })
  })

  test("subtract throws TypeError on mixed currencies", () => {
    expect(() => subtract(money(100, "USD"), money(30, "EGP"))).toThrow(TypeError)
  })

  test("equals is true for the same amount and currency and false when either differs", () => {
    expect(equals(money(100, "USD"), money(100, "USD"))).toBe(true)
    expect(equals(money(100, "USD"), money(200, "USD"))).toBe(false)
    expect(equals(money(100, "USD"), money(100, "EGP"))).toBe(false)
  })

  test("property: for any two integers a and b, add(money(a,\"USD\"), money(b,\"USD\")).minor === a + b", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(add(money(a, "USD"), money(b, "USD")).minor).toBe(a + b)
      })
    )
  })

  test("property: add is commutative for same-currency amounts", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(add(money(a, "USD"), money(b, "USD"))).toEqual(
          add(money(b, "USD"), money(a, "USD"))
        )
      })
    )
  })
})

import { CURRENCY_EXPONENTS, currencyExponent, minorUnitsPerUnit, isCurrencyCode } from "./money"

describe("currency exponents", () => {
  test("JOD has exponent 3, the rest 2", () => {
    expect(CURRENCY_EXPONENTS.JOD).toBe(3)
    for (const c of ["USD", "EGP", "SAR", "AED"] as const) {
      expect(CURRENCY_EXPONENTS[c]).toBe(2)
    }
  })

  test("currencyExponent returns the exponent", () => {
    expect(currencyExponent("JOD")).toBe(3)
    expect(currencyExponent("USD")).toBe(2)
  })

  test("minorUnitsPerUnit returns 10 ** exponent", () => {
    expect(minorUnitsPerUnit("JOD")).toBe(1000)
    expect(minorUnitsPerUnit("USD")).toBe(100)
  })
})

describe("isCurrencyCode", () => {
  test("returns true for supported codes", () => {
    for (const c of ["USD", "EGP", "SAR", "AED", "JOD"]) {
      expect(isCurrencyCode(c)).toBe(true)
    }
  })
  test("returns false for unsupported values", () => {
    for (const v of ["", "EUR", "usd", "GBP"]) {
      expect(isCurrencyCode(v)).toBe(false)
    }
  })
})

describe("majorToMinor", () => {
  test('majorToMinor(4.99, "USD") === 499', () => {
    expect(majorToMinor(4.99, "USD")).toBe(499)
  })

  test('majorToMinor(270.81, "EGP") === 27081', () => {
    expect(majorToMinor(270.81, "EGP")).toBe(27081)
  })

  test('majorToMinor(1.234, "JOD") === 1234', () => {
    expect(majorToMinor(1.234, "JOD")).toBe(1234)
  })
})
