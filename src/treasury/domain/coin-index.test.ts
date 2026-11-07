import { describe, expect, it } from "vitest"
import {
  COIN_INDEX_BASE,
  DEFAULT_COIN_INDEX,
  DEFAULT_COIN_INDEX_CAP_BPS,
  coinValueMinor,
  coinValueUsd,
  coinsForUsdMinor,
  coinsForUsdtMinor,
  nextCoinIndex,
  reservedUsdtMinor,
} from "./coin-index"

describe("coin-index", () => {
  it("exports base/default constants", () => {
    expect(COIN_INDEX_BASE).toBe(1_000_000)
    expect(DEFAULT_COIN_INDEX).toBe(1_000_000)
    expect(DEFAULT_COIN_INDEX_CAP_BPS).toBe(500)
  })

  it("computes coin value in USD minor units from index micro", () => {
    expect(coinValueMinor(COIN_INDEX_BASE)).toBe(1)
    expect(coinValueMinor(1_050_000)).toBe(1)
    expect(coinValueMinor(1_500_000)).toBe(2)
    expect(coinValueMinor(1)).toBe(1)
  })

  it("converts coin value to USD display units", () => {
    expect(coinValueUsd(1)).toBe(0.01)
    expect(coinValueUsd(105)).toBe(1.05)
  })

  it("converts USD minor to whole coins by ceiling", () => {
    expect(coinsForUsdMinor(0, 100)).toBe(0)
    expect(coinsForUsdMinor(100, 100)).toBe(1)
    expect(coinsForUsdMinor(101, 100)).toBe(2)
    expect(coinsForUsdMinor(250, 100)).toBe(3)
  })

  it("computes reserved USDT minor and coins from USDT minor", () => {
    expect(reservedUsdtMinor(3, 105)).toBe(315)
    expect(coinsForUsdtMinor(315, 105)).toBe(3)
    expect(coinsForUsdtMinor(314, 105)).toBe(2)
  })

  it("returns no-op for empty changes", () => {
    expect(nextCoinIndex(1_000_000, [], 500)).toEqual({
      fromIndexMicro: 1_000_000,
      indexMicro: 1_000_000,
      meanRatioBps: 10_000,
      capped: false,
    })
  })

  it("applies equal-weight mean ratio when under cap", () => {
    const move = nextCoinIndex(
      1_000_000,
      [
        { previousCostMinor: 100, currentCostMinor: 102 },
        { previousCostMinor: 200, currentCostMinor: 206 },
      ],
      500,
    )
    expect(move).toEqual({
      fromIndexMicro: 1_000_000,
      indexMicro: 1_025_000,
      meanRatioBps: 10_250,
      capped: false,
    })
  })

  it("clamps upward moves to cap", () => {
    const move = nextCoinIndex(
      1_000_000,
      [{ previousCostMinor: 100, currentCostMinor: 120 }],
      500,
    )
    expect(move).toEqual({
      fromIndexMicro: 1_000_000,
      indexMicro: 1_050_000,
      meanRatioBps: 12_000,
      capped: true,
    })
  })

  it("clamps downward moves to cap", () => {
    const move = nextCoinIndex(
      1_000_000,
      [{ previousCostMinor: 100, currentCostMinor: 80 }],
      500,
    )
    expect(move).toEqual({
      fromIndexMicro: 1_000_000,
      indexMicro: 950_000,
      meanRatioBps: 8_000,
      capped: true,
    })
  })

  it("throws RangeError on invalid inputs", () => {
    expect(() => coinValueMinor(0)).toThrow(RangeError)
    expect(() => coinValueMinor(-1)).toThrow(RangeError)
    expect(() => coinValueMinor(1.5)).toThrow(RangeError)
    expect(() => coinValueUsd(0)).toThrow(RangeError)
    expect(() => coinsForUsdMinor(-1, 100)).toThrow(RangeError)
    expect(() => coinsForUsdMinor(100, 0)).toThrow(RangeError)
    expect(() => reservedUsdtMinor(-1, 100)).toThrow(RangeError)
    expect(() => coinsForUsdtMinor(100, -1)).toThrow(RangeError)
    expect(() => nextCoinIndex(0, [], 500)).toThrow(RangeError)
    expect(() => nextCoinIndex(1_000_000, [], -1)).toThrow(RangeError)
    expect(() => nextCoinIndex(1_000_000, [], 10_001)).toThrow(RangeError)
    expect(() =>
      nextCoinIndex(1_000_000, [{ previousCostMinor: 0, currentCostMinor: 100 }], 500),
    ).toThrow(RangeError)
    expect(() =>
      nextCoinIndex(1_000_000, [{ previousCostMinor: 100, currentCostMinor: 0 }], 500),
    ).toThrow(RangeError)
  })
})
