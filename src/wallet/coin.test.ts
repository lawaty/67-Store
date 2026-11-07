import { assertPositiveCoins } from "./coin"

import { describe, expect, it } from "vitest"

describe("assertPositiveCoins", () => {
  it("accepts 1 and 500", () => {
    expect(() => assertPositiveCoins(1)).not.toThrow()
    expect(() => assertPositiveCoins(500)).not.toThrow()
  })

  it("throws for 0, -1, 1.5 and NaN", () => {
    expect(() => assertPositiveCoins(0)).toThrow(RangeError)
    expect(() => assertPositiveCoins(-1)).toThrow(RangeError)
    expect(() => assertPositiveCoins(1.5)).toThrow(RangeError)
    expect(() => assertPositiveCoins(NaN)).toThrow(RangeError)
  })
})
