/**
 * Eligibility and parsing helpers for Binance P2P ads. A single source of truth
 * for which offers count in pricing/stats and how their fields are read.
 */
export const MIN_OFFER_TRADABLE_USDT = 200

export function parseTradableQuantity(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d+(\.\d+)?$/.test(raw)) {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function parsePriceToMinor(raw: unknown): number | null {
  if (typeof raw !== "string") {
    return null
  }
  // must not contain spaces
  if (raw.trim() !== raw) {
    return null
  }
  // check format - optional sign? prices are positive; but be strict
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return null
  }
  const parts = raw.split(".")
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

function advOf(ad: unknown): Record<string, unknown> | null {
  if (typeof ad !== "object" || ad === null) return null
  const adv = (ad as Record<string, unknown>).adv
  if (typeof adv !== "object" || adv === null) return null
  return adv as Record<string, unknown>
}

export function extractTradeMethodNames(ad: unknown): string[] {
  const adv = advOf(ad)
  if (!adv) return []
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

export function hasPaymentMethod(ad: unknown, needle: string): boolean {
  const n = needle.toLowerCase()
  return extractTradeMethodNames(ad).some((name) => name.toLowerCase().includes(n))
}

export function isEligibleAd(ad: unknown): boolean {
  if (typeof ad !== "object" || ad === null) return false
  const adRecord = ad as Record<string, unknown>
  if (adRecord.privilegeType !== null && adRecord.privilegeType !== undefined) {
    return false
  }
  const adv = advOf(adRecord)
  if (!adv) return false
  const tradableQuantity = parseTradableQuantity(adv.tradableQuantity)
  if (tradableQuantity === null || tradableQuantity < MIN_OFFER_TRADABLE_USDT) {
    return false
  }
  const minor = parsePriceToMinor(adv.price)
  return minor !== null && minor > 0 && Number.isSafeInteger(minor)
}

export function isEligibleVodafoneCash(ad: unknown): boolean {
  return isEligibleAd(ad) && hasPaymentMethod(ad, "vodafone")
}
