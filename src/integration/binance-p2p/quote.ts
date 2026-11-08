/**
 * Parses a Binance P2P advert book into EGP-per-USDT quotes, taking the median
 * of the ten cheapest eligible ads per payment method (bank transfer and
 * Vodafone Cash) so one mispriced advert cannot move the rate. The headline is
 * the higher of the two present methods.
 */
import { P2pQuote } from "@/treasury"
import { P2pRateError } from "@/treasury"
import type { P2pPriceRange, P2pFetchStats } from "@/treasury"
import { DEFAULT_P2P_OUTLIER_SIGMA, MAX_P2P_OUTLIER_SIGMA, MIN_P2P_OUTLIER_SIGMA } from "@/shared/p2p-settings"
import {
  parsePriceToMinor as parsePriceToMinorImpl,
  isEligibleAd as isEligibleAdImpl,
  isEligibleVodafoneCash,
  hasPaymentMethod,
} from "./eligibility"

export type { P2pPriceRange, P2pFetchStats }

// Compatibility re-exports (older code may import from quote.ts).
export {
  MIN_OFFER_TRADABLE_USDT,
  parsePriceToMinor,
  parseTradableQuantity,
  isEligibleAd,
  isEligibleVodafoneCash,
  extractTradeMethodNames,
  hasPaymentMethod,
} from "./eligibility"

export type P2pMethodQuote = {
  readonly egpPerUsdtMinor: number
  readonly bankTransferEgpPerUsdtMinor: number | null
  readonly vodafoneEgpPerUsdtMinor: number | null
  readonly range: P2pPriceRange | null
  readonly fetchedAt: string
  readonly currentEgpPerUsdtMinor: number | null
  readonly allEligibleStats: P2pFetchStats | null
}

export const P2P_OUTLIER_SIGMA = DEFAULT_P2P_OUTLIER_SIGMA

function normalizeOutlierSigma(sigma: number | undefined): number {
  if (sigma === undefined) return DEFAULT_P2P_OUTLIER_SIGMA
  if (!Number.isSafeInteger(sigma) || sigma < MIN_P2P_OUTLIER_SIGMA || sigma > MAX_P2P_OUTLIER_SIGMA) {
    return DEFAULT_P2P_OUTLIER_SIGMA
  }
  return sigma
}

function meanAndStdDev(prices: readonly number[]): { mean: number; stdDev: number } {
  if (prices.length === 0) {
    return { mean: 0, stdDev: 0 }
  }
  const sum = prices.reduce((total, price) => total + price, 0)
  const mean = sum / prices.length
  const variance = prices.reduce((total, price) => total + (price - mean) ** 2, 0) / prices.length
  return { mean, stdDev: Math.sqrt(variance) }
}

function excludeOutliers(prices: readonly number[], sigma: number): { kept: number[]; outlierCount: number } {
  if (prices.length < 4) {
    return { kept: [...prices], outlierCount: 0 }
  }
  const { mean, stdDev } = meanAndStdDev(prices)
  if (stdDev === 0) {
    return { kept: [...prices], outlierCount: 0 }
  }
  const kept = prices.filter((price) => Math.abs(price - mean) <= sigma * stdDev)
  if (kept.length < 3) {
    return { kept: [...prices], outlierCount: 0 }
  }
  return { kept, outlierCount: prices.length - kept.length }
}

function validateEnvelope(body: unknown): unknown[] {
  if (typeof body !== "object" || body === null) {
    throw new P2pRateError(0, "invalid envelope")
  }
  const b = body as Record<string, unknown>
  if (b.code !== "000000") {
    throw new P2pRateError(0, "invalid envelope")
  }
  if (!Array.isArray(b.data)) {
    throw new P2pRateError(0, "invalid envelope")
  }
  return b.data
}

function advOf(ad: unknown): Record<string, unknown> | null {
  if (typeof ad !== "object" || ad === null) return null
  const adv = (ad as Record<string, unknown>).adv
  if (typeof adv !== "object" || adv === null) return null
  return adv as Record<string, unknown>
}

function eligiblePrice(ad: unknown): number | null {
  if (!isEligibleAdImpl(ad)) return null
  const adv = advOf(ad)
  if (!adv) return null
  return parsePriceToMinorImpl(adv.price)
}

function collectValidPrices(data: unknown[]): number[] {
  const validPrices: number[] = []
  for (const ad of data) {
    const minor = eligiblePrice(ad)
    if (minor !== null) {
      validPrices.push(minor)
    }
  }
  return validPrices
}

function medianOfTop10Cheapest(validPrices: number[]): number {
  if (validPrices.length < 3) {
    throw new P2pRateError(0, "too few ads")
  }
  const sorted = [...validPrices].sort((a, b) => a - b)
  const top10 = sorted.slice(0, 10)
  if (top10.length < 3) {
    throw new P2pRateError(0, "too few ads")
  }
  let median: number
  if (top10.length % 2 === 1) {
    const idx = Math.floor(top10.length / 2)
    median = top10[idx]
  } else {
    const mid1 = top10[top10.length / 2 - 1]
    const mid2 = top10[top10.length / 2]
    const mean = (mid1 + mid2) / 2
    // round HALF-UP to integer
    median = Math.floor(mean + 0.5)
  }
  if (!Number.isSafeInteger(median) || median <= 0) {
    throw new P2pRateError(0, "too few ads")
  }
  return median
}

function filteredMedianOfTop10Cheapest(validPrices: number[], sigma: number): number {
  const { kept } = excludeOutliers(validPrices, sigma)
  if (kept.length < 3) {
    throw new P2pRateError(0, "too few ads")
  }
  return medianOfTop10Cheapest(kept)
}

// Combined range over all ads offering bank transfer or Vodafone Cash:
// min, average (round HALF-UP to integer minor), max and ad count.
function priceRangeFromPrices(prices: number[], sigma: number): P2pPriceRange | null {
  const { kept, outlierCount } = excludeOutliers(prices, sigma)
  if (kept.length < 3) {
    return null
  }
  const sorted = [...kept].sort((a, b) => a - b)
  const sum = sorted.reduce((total, price) => total + price, 0)
  const avg = Math.floor(sum / sorted.length + 0.5)
  const stdDevEgpPerUsdtMinor = Math.floor(meanAndStdDev(kept).stdDev + 0.5)
  return {
    minEgpPerUsdtMinor: sorted[0],
    avgEgpPerUsdtMinor: avg,
    maxEgpPerUsdtMinor: sorted[sorted.length - 1],
    adCount: sorted.length,
    priceSumMinor: sum,
    stdDevEgpPerUsdtMinor,
    outlierCount,
  }
}

export function computeAllEligibleStats(prices: number[], sigma: number): P2pFetchStats | null {
  if (prices.length === 0) {
    return null
  }
  const { kept, outlierCount } = excludeOutliers(prices, sigma)
  if (kept.length === 0) {
    return null
  }
  const sorted = [...kept].sort((a, b) => a - b)
  const sum = sorted.reduce((total, price) => total + price, 0)
  const sumSquares = sorted.reduce((total, price) => total + price * price, 0)
  const avg = Math.floor(sum / sorted.length + 0.5)
  const stdDevEgpPerUsdtMinor = Math.floor(meanAndStdDev(kept).stdDev + 0.5)
  return {
    minEgpPerUsdtMinor: sorted[0],
    maxEgpPerUsdtMinor: sorted[sorted.length - 1],
    avgEgpPerUsdtMinor: avg,
    offerCount: sorted.length,
    priceSumMinor: sum,
    sumSquaresMinor: sumSquares,
    stdDevEgpPerUsdtMinor,
    outlierCount,
  }
}

export function p2pQuoteFromAds(body: unknown, fetchedAt: string, outlierSigma = P2P_OUTLIER_SIGMA): P2pQuote {
  const sigma = normalizeOutlierSigma(outlierSigma)
  const data = validateEnvelope(body)
  const validPrices = collectValidPrices(data)
  const median = filteredMedianOfTop10Cheapest(validPrices, sigma)
  return { egpPerUsdtMinor: median, fetchedAt }
}

export function p2pMethodQuoteFromAds(body: unknown, fetchedAt: string, outlierSigma = P2P_OUTLIER_SIGMA): P2pMethodQuote {
  const sigma = normalizeOutlierSigma(outlierSigma)
  const data = validateEnvelope(body)
  const bankTransferPrices: number[] = []
  const vodafonePrices: number[] = []
  const p2pPrices: number[] = []
  const allEligiblePrices: number[] = []
  const eligibleVodafonePrices: number[] = []

  for (const ad of data) {
    if (typeof ad !== "object" || ad === null) {
      continue
    }
    const adRecord = ad as Record<string, unknown>
    const minor = eligiblePrice(adRecord)
    if (minor === null) {
      continue
    }
    allEligiblePrices.push(minor)
    if (isEligibleVodafoneCash(adRecord)) {
      eligibleVodafonePrices.push(minor)
    }

    const hasBank = hasPaymentMethod(adRecord, "bank")
    const hasVodafone = hasPaymentMethod(adRecord, "vodafone")
    if (hasBank) {
      bankTransferPrices.push(minor)
    }
    if (hasVodafone) {
      vodafonePrices.push(minor)
    }
    if (hasBank || hasVodafone) {
      p2pPrices.push(minor)
    }
  }

  const bankTransferEgpPerUsdtMinor =
    bankTransferPrices.length >= 3 ? filteredMedianOfTop10Cheapest(bankTransferPrices, sigma) : null
  const vodafoneEgpPerUsdtMinor =
    vodafonePrices.length >= 3 ? filteredMedianOfTop10Cheapest(vodafonePrices, sigma) : null
  const range = priceRangeFromPrices(p2pPrices, sigma)
  const currentEgpPerUsdtMinor =
    eligibleVodafonePrices.length > 0 ? Math.min(...eligibleVodafonePrices) : null
  const allEligibleStats = computeAllEligibleStats(allEligiblePrices, sigma)

  let egpPerUsdtMinor: number
  if (bankTransferEgpPerUsdtMinor !== null && vodafoneEgpPerUsdtMinor !== null) {
    egpPerUsdtMinor = Math.max(bankTransferEgpPerUsdtMinor, vodafoneEgpPerUsdtMinor)
  } else if (bankTransferEgpPerUsdtMinor !== null) {
    egpPerUsdtMinor = bankTransferEgpPerUsdtMinor
  } else if (vodafoneEgpPerUsdtMinor !== null) {
    egpPerUsdtMinor = vodafoneEgpPerUsdtMinor
  } else {
    throw new P2pRateError(0, "too few ads")
  }

  return {
    egpPerUsdtMinor,
    bankTransferEgpPerUsdtMinor,
    vodafoneEgpPerUsdtMinor,
    range,
    fetchedAt,
    currentEgpPerUsdtMinor,
    allEligibleStats,
  }
}

