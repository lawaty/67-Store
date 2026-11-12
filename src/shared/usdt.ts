/**
 * Milli-USDT is for treasury USDT quantities; product prices remain USD cents
 * and must not use this module.
 */
export const USDT_MILLI_PER_USDT = 1000
export const USDT_MILLI_PER_USD_MINOR = 10

function assertNonNegativeSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError()
  }
}

export function usdtMilliFromUsdMinor(usdMinor: number): number {
  assertNonNegativeSafeInteger(usdMinor)
  const usdtMilli = usdMinor * USDT_MILLI_PER_USD_MINOR
  if (!Number.isSafeInteger(usdtMilli)) {
    throw new RangeError()
  }
  return usdtMilli
}

export function usdMinorFloorFromUsdtMilli(usdtMilli: number): number {
  assertNonNegativeSafeInteger(usdtMilli)
  return Math.floor(usdtMilli / USDT_MILLI_PER_USD_MINOR)
}
