/**
 * UI-safe funding math: derives the effective EGP-per-USDT rate (EGP minor per
 * 1 USDT, rounded half-up) from primitive totals. No domain object dependency;
 * `src/treasury/domain/funding.ts` delegates to this so the core and UI render
 * the same value.
 */
import { USDT_MILLI_PER_USDT } from "@/shared/usdt"

export function inferredEgpPerUsdtMinor(egpPaidMinor: number, usdtMilli: number): number {
  if (!Number.isSafeInteger(egpPaidMinor) || egpPaidMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(usdtMilli) || usdtMilli <= 0) {
    throw new RangeError()
  }
  const numerator = egpPaidMinor * USDT_MILLI_PER_USDT
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  const result = Math.floor((numerator + usdtMilli / 2) / usdtMilli)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
