/**
 * Computes the coin index (micro, 1_000_000 = 1.0 = 1 cent per coin) and coin/USD-minor
 * conversions. Cost/price inputs are USD minor units (cents); treasury USDT outputs use
 * milli-USDT; outputs are safe integers.
 */
import { USDT_MILLI_PER_USD_MINOR } from "@/shared/usdt"

export const COIN_INDEX_BASE = 1_000_000
export const DEFAULT_COIN_INDEX = COIN_INDEX_BASE
export const DEFAULT_COIN_INDEX_CAP_BPS = 500

export type CoinIndexChange = {
  previousCostMinor: number
  currentCostMinor: number
}

export type CoinIndexMove = {
  fromIndexMicro: number
  indexMicro: number
  meanRatioBps: number
  capped: boolean
}

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`)
  }
}

function assertSafePositive(value: number, name: string): void {
  assertSafeInteger(value, name)
  if (value <= 0) {
    throw new RangeError(`${name} must be positive`)
  }
}

function assertSafeNonNegative(value: number, name: string): void {
  assertSafeInteger(value, name)
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`)
  }
}

export function coinValueMinor(indexMicro: number): number {
  assertSafePositive(indexMicro, "indexMicro")
  return Math.max(1, Math.round(indexMicro / COIN_INDEX_BASE))
}

export function coinValueUsd(coinValueMinor: number): number {
  assertSafePositive(coinValueMinor, "coinValueMinor")
  return coinValueMinor / 100
}

export function coinsForUsdMinor(usdMinor: number, coinValueMinor: number): number {
  assertSafeNonNegative(usdMinor, "usdMinor")
  assertSafePositive(coinValueMinor, "coinValueMinor")
  if (usdMinor === 0) {
    return 0
  }
  const coins = Math.ceil(usdMinor / coinValueMinor)
  assertSafeInteger(coins, "coins")
  return coins
}

export function reservedUsdtMilli(coins: number, coinValueMinor: number): number {
  assertSafeNonNegative(coins, "coins")
  assertSafePositive(coinValueMinor, "coinValueMinor")
  const reserved = coins * coinValueMinor * USDT_MILLI_PER_USD_MINOR
  assertSafeInteger(reserved, "reservedUsdtMilli")
  return reserved
}

export function coinsForUsdtMilli(usdtMilli: number, coinValueMinor: number): number {
  assertSafeNonNegative(usdtMilli, "usdtMilli")
  assertSafePositive(coinValueMinor, "coinValueMinor")
  const coins = Math.floor(usdtMilli / (coinValueMinor * USDT_MILLI_PER_USD_MINOR))
  assertSafeInteger(coins, "coins")
  return coins
}

export function nextCoinIndex(
  indexMicro: number,
  changes: readonly CoinIndexChange[],
  capBps: number,
): CoinIndexMove {
  assertSafePositive(indexMicro, "indexMicro")
  assertSafeInteger(capBps, "capBps")
  if (capBps < 0 || capBps > 10_000) {
    throw new RangeError("capBps must be between 0 and 10000")
  }

  for (const change of changes) {
    assertSafePositive(change.previousCostMinor, "previousCostMinor")
    assertSafePositive(change.currentCostMinor, "currentCostMinor")
  }

  if (changes.length === 0) {
    return {
      fromIndexMicro: indexMicro,
      indexMicro,
      meanRatioBps: 10_000,
      capped: false,
    }
  }

  let ratioSumMicro = 0
  for (const change of changes) {
    const ratioMicro = Math.round(
      (change.currentCostMinor * COIN_INDEX_BASE) / change.previousCostMinor,
    )
    assertSafeInteger(ratioMicro, "ratioMicro")
    ratioSumMicro += ratioMicro
    assertSafeInteger(ratioSumMicro, "ratioSumMicro")
  }

  const meanRatioMicro = Math.round(ratioSumMicro / changes.length)
  assertSafeInteger(meanRatioMicro, "meanRatioMicro")

  const capDeltaMicro = capBps * 100
  const minRatioMicro = COIN_INDEX_BASE - capDeltaMicro
  const maxRatioMicro = COIN_INDEX_BASE + capDeltaMicro
  const clampedRatioMicro = Math.min(maxRatioMicro, Math.max(minRatioMicro, meanRatioMicro))
  const capped = clampedRatioMicro !== meanRatioMicro

  const nextIndexMicro = Math.round((indexMicro * clampedRatioMicro) / COIN_INDEX_BASE)
  assertSafePositive(nextIndexMicro, "indexMicro")

  return {
    fromIndexMicro: indexMicro,
    indexMicro: nextIndexMicro,
    meanRatioBps: Math.round(meanRatioMicro / 100),
    capped,
  }
}
