import { describe, expect, it } from "vitest"
import {
  displayCurrency,
  formatBps,
  formatIndex,
  formatMinor,
  formatSignedBps,
  formatUsdtMilli,
} from "./format"

describe("formatMinor", () => {
  it("formats USD with 2 decimals and grouping", () => {
    expect(formatMinor(123456, "USD")).toBe("1,234.56")
  })

  it("formats EGP with 2 decimals", () => {
    expect(formatMinor(123456, "EGP")).toBe("1,234.56")
  })

  it("falls back to USD 2 decimals for USDT", () => {
    expect(formatMinor(123456, "USDT")).toBe("1,234.56")
  })

  it("uses exponent 3 for JOD", () => {
    expect(formatMinor(1234567, "JOD")).toBe("1,234.567")
    expect(formatMinor(1000, "JOD")).toBe("1.000")
  })

  it("defaults to USD when currency is omitted", () => {
    expect(formatMinor(100)).toBe("1.00")
  })

  it("preserves negative values", () => {
    expect(formatMinor(-123456, "USD")).toBe("-1,234.56")
    expect(formatMinor(-1234567, "JOD")).toBe("-1,234.567")
  })
})

it("maps USD to USDT and leaves other currencies", () => {
  expect(displayCurrency("USD")).toBe("USDT")
  expect(displayCurrency("EGP")).toBe("EGP")
})

describe("formatBps", () => {
  it("formats 100 bps as 1.00%", () => {
    expect(formatBps(100)).toBe("1.00%")
  })

  it("uses 2 digits by default", () => {
    expect(formatBps(500)).toBe("5.00%")
    expect(formatBps(0)).toBe("0.00%")
  })

  it("honours custom digits", () => {
    expect(formatBps(100, 0)).toBe("1%")
    expect(formatBps(100, 4)).toBe("1.0000%")
  })
})

describe("formatSignedBps", () => {
  it("signs positive values with +", () => {
    expect(formatSignedBps(500)).toBe("+5.00%")
  })

  it("signs negative values with -", () => {
    expect(formatSignedBps(-500)).toBe("-5.00%")
  })

  it("leaves zero unsigned", () => {
    expect(formatSignedBps(0)).toBe("0.00%")
  })
})

describe("formatIndex", () => {
  it("uses 4 digits by default", () => {
    expect(formatIndex(1)).toBe("1.0000")
    expect(formatIndex(1.23456)).toBe("1.2346")
  })

  it("groups the integer part", () => {
    expect(formatIndex(1234.5)).toBe("1,234.5000")
  })

  it("honours custom digits", () => {
    expect(formatIndex(1.2345, 2)).toBe("1.23")
  })
})

describe("formatUsdtMilli", () => {
  it("formats milli-USDT treasury quantities at 3 decimals by default", () => {
    expect(formatUsdtMilli(1234)).toBe("1.234")
    expect(formatUsdtMilli(1000)).toBe("1.000")
    expect(formatUsdtMilli(999)).toBe("0.999")
    expect(formatUsdtMilli(0)).toBe("0.000")
  })

  it("preserves negative values", () => {
    expect(formatUsdtMilli(-1234)).toBe("-1.234")
  })
})
