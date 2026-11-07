/**
 * UI-safe funding math: derives the effective EGP-per-USDT rate (minor units
 * per 100 USDT units, rounded half-up) from primitive totals. No domain object
 * dependency; `src/treasury/domain/funding.ts` delegates to this so the core
 * and UI render the same value.
 */
export function inferredEgpPerUsdtMinor(egpPaidMinor: number, usdtMinor: number): number {
  if (!Number.isSafeInteger(egpPaidMinor) || egpPaidMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(usdtMinor) || usdtMinor <= 0) {
    throw new RangeError()
  }
  const numerator = egpPaidMinor * 100
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  const result = Math.floor((numerator + usdtMinor / 2) / usdtMinor)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
