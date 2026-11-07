/**
 * Parses a Binance P2P advert book into EGP-per-USDT quotes, taking the median
 * of the ten cheapest eligible ads per payment method (bank transfer and
 * Vodafone Cash) so one mispriced advert cannot move the rate. The headline is
 * the higher of the two present methods.
 */
import { P2pQuote } from "@/treasury"
import { P2pRateError } from "@/treasury"
import type { P2pPriceRange } from "@/treasury"
import { DEFAULT_P2P_OUTLIER_SIGMA, MAX_P2P_OUTLIER_SIGMA, MIN_P2P_OUTLIER_SIGMA } from "@/shared/p2p-settings"

export type { P2pPriceRange }

export type P2pMethodQuote = {
  readonly egpPerUsdtMinor: number
  readonly bankTransferEgpPerUsdtMinor: number | null
  readonly vodafoneEgpPerUsdtMinor: number | null
  readonly range: P2pPriceRange | null
  readonly fetchedAt: string
}

export const P2P_OUTLIER_SIGMA = DEFAULT_P2P_OUTLIER_SIGMA
const MIN_OFFER_TRADABLE_USDT = 200

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

function parsePriceToMinor(price: string): number | null {
  if (typeof price !== "string") {
    return null
  }
  // must not contain spaces
  if (price.trim() !== price) {
    return null
  }
  // check format - optional sign? prices are positive; but be strict
  if (!/^\d+(\.\d+)?$/.test(price)) {
    return null
  }
  const parts = price.split(".")
  if (parts.length === 1) {
    const intPart = parts[0]
    const minorStr = intPart + "00"
    // check if it's integer string without leading zeros issues except for "0" itself - but price must be positive
    if (intPart === "0") {
      return null
    }
    // disallow leading zeros like 0123? better to be strict - "0123" would fail ^\d+ but "0" is caught; numbers like 012 are not decimal strings in normal form, but regex allows 0 followed by digits only if we had ^0\d+ which we don't - ^\d+ means one or more digits, so 012 would match as 012 as the whole string? "012" matches ^\d+ as "012" (all digits) - but that's not the same as decimal string normalization; better to reject leading zeros unless it's exactly "0"
    if (intPart.length > 1 && intPart.startsWith("0")) {
      return null
    }
    const minor = Number(minorStr)
    if (!Number.isSafeInteger(minor) || minor <= 0) {
      return null
    }
    return minor
  } else if (parts.length === 2) {
    const intPart = parts[0]
    const fracPart = parts[1]
    if (fracPart.length > 2) {
      return null
    }
    if (intPart === "0" && fracPart.length === 0) {
      return null
    }
    if (intPart.length > 1 && intPart.startsWith("0")) {
      return null
    }
    const fracPadded = fracPart.padEnd(2, "0")
    const minorStr = intPart + fracPadded
    // also check combined - e.g. if intPart is "0" that's fine as long as result > 0
    const combined = BigInt(intPart === "" ? "0" : intPart) * BigInt(100) + BigInt(fracPadded)
    if (combined <= BigInt(0)) {
      return null
    }
    const minor = Number(minorStr)
    if (!Number.isSafeInteger(minor) || minor <= 0) {
      return null
    }
    return minor
  }
  return null
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

function parseTradableQuantity(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value)) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isEligibleAd(ad: Record<string, unknown>, adv: Record<string, unknown>): boolean {
  if (ad.privilegeType !== null && ad.privilegeType !== undefined) {
    return false
  }
  const tradableQuantity = parseTradableQuantity(adv.tradableQuantity)
  return tradableQuantity !== null && tradableQuantity >= MIN_OFFER_TRADABLE_USDT
}

function collectValidPrices(data: unknown[]): number[] {
  const validPrices: number[] = []
  for (const ad of data) {
    if (typeof ad !== "object" || ad === null) {
      continue
    }
    const adRecord = ad as Record<string, unknown>
    const adv = adRecord.adv
    if (typeof adv !== "object" || adv === null) {
      continue
    }
    const advRecord = adv as Record<string, unknown>
    if (!isEligibleAd(adRecord, advRecord)) {
      continue
    }
    const price = advRecord.price
    if (typeof price === "string") {
      const minor = parsePriceToMinor(price)
      if (minor !== null && minor > 0 && Number.isSafeInteger(minor)) {
        validPrices.push(minor)
      }
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

function extractTradeMethodNames(adv: Record<string, unknown>): string[] {
  const methods = adv.tradeMethods
  if (!Array.isArray(methods)) {
    return []
  }
  const names: string[] = []
  for (const m of methods) {
    if (typeof m !== "object" || m === null) {
      continue
    }
    const name = (m as Record<string, unknown>).tradeMethodName
    if (typeof name === "string") {
      names.push(name)
    }
  }
  return names
}

function hasMethod(methodNames: string[], needle: string): boolean {
  const n = needle.toLowerCase()
  return methodNames.some((name) => name.toLowerCase().includes(n))
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
  for (const ad of data) {
    if (typeof ad !== "object" || ad === null) {
      continue
    }
    const adRecord = ad as Record<string, unknown>
    const adv = adRecord.adv
    if (typeof adv !== "object" || adv === null) {
      continue
    }
    const advRecord = adv as Record<string, unknown>
    if (!isEligibleAd(adRecord, advRecord)) {
      continue
    }
    const price = advRecord.price
    if (typeof price !== "string") {
      continue
    }
    const minor = parsePriceToMinor(price)
    if (minor === null || minor <= 0 || !Number.isSafeInteger(minor)) {
      continue
    }
    const methodNames = extractTradeMethodNames(advRecord)
    const hasBank = hasMethod(methodNames, "bank")
    const hasVodafone = hasMethod(methodNames, "vodafone")
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

  return { egpPerUsdtMinor, bankTransferEgpPerUsdtMinor, vodafoneEgpPerUsdtMinor, range, fetchedAt }
}
