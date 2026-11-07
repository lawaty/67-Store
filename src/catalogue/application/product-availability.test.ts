import { describe, expect, test } from "vitest"
import { productAvailability } from "./product-availability"

describe("productAvailability", () => {
  test("inactive product is not buyable regardless of funds", () => {
    expect(productAvailability({ active: false, costMinor: 100, availableUsdtMinor: 999 })).toEqual({
      buyable: false,
      fundingGapMinor: 0,
      unavailableReason: "inactive",
    })
  })

  test("unknown available balance marks product unknown", () => {
    expect(productAvailability({ active: true, costMinor: 100, availableUsdtMinor: null })).toEqual({
      buyable: false,
      fundingGapMinor: 0,
      unavailableReason: "unknown_balance",
    })
  })

  test("affordable active product is buyable", () => {
    expect(productAvailability({ active: true, costMinor: 100, availableUsdtMinor: 100 })).toEqual({
      buyable: true,
      fundingGapMinor: 0,
      unavailableReason: null,
    })
    expect(productAvailability({ active: true, costMinor: 100, availableUsdtMinor: 150 })).toEqual({
      buyable: true,
      fundingGapMinor: 0,
      unavailableReason: null,
    })
  })

  test("shortfall returns insufficient funds gap", () => {
    expect(productAvailability({ active: true, costMinor: 250, availableUsdtMinor: 100 })).toEqual({
      buyable: false,
      fundingGapMinor: 150,
      unavailableReason: "insufficient_funds",
    })
  })
})
