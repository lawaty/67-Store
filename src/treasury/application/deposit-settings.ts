/**
 * Reads per-currency deposit rate and fee basis-point settings
 * (`deposit:rate:*`, `deposit:fee_bps:*`), applying defaults when missing or
 * invalid.
 */
import { SettingsRepository } from "@/shared/settings-repository"
import { CurrencyCode } from "@/shared/money"
import { readEgpRate } from "./exchange-rate"
import { readCoinValueMinor } from "./coin-index-settings"

export const DEPOSIT_RATE_KEY = (currency: CurrencyCode) => `deposit:rate:${currency}`
export const DEPOSIT_FEE_BPS_KEY = (currency: CurrencyCode) => `deposit:fee_bps:${currency}`

export const DEFAULT_DEPOSIT_RATES: Readonly<Record<CurrencyCode, number>> = {
  USD: 1, EGP: 0, SAR: 375, AED: 367, JOD: 708,
}

export const DEFAULT_DEPOSIT_FEE_BPS = 0

function parseFeeBps(raw: string | null): number {
  if (raw === null) {
    return DEFAULT_DEPOSIT_FEE_BPS
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return DEFAULT_DEPOSIT_FEE_BPS
  }
  return n
}

function parseStoredRate(raw: string | null, fallback: number): number {
  if (raw === null) {
    return fallback
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || !Number.isSafeInteger(n) || n <= 0) {
    return fallback
  }
  return n
}

export async function readDepositRate(
  settings: SettingsRepository,
  currency: CurrencyCode,
  wacEgpMinor: number,
  coinValueMinor?: number,
): Promise<number> {
  const resolvedCoinValueMinor =
    coinValueMinor === undefined ? await readCoinValueMinor(settings) : coinValueMinor
  const feeBps = parseFeeBps(await settings.get(DEPOSIT_FEE_BPS_KEY(currency)))

  let base: number
  if (currency === "EGP") {
    const marketMinor = Math.round((await readEgpRate(settings)) * 100)
    base = Math.round(
      (resolvedCoinValueMinor * Math.max(wacEgpMinor, marketMinor)) / 100,
    )
  } else if (currency === "USD") {
    base = resolvedCoinValueMinor
  } else {
    const fallback = DEFAULT_DEPOSIT_RATES[currency]
    const storedOrDefaultRate = parseStoredRate(
      await settings.get(DEPOSIT_RATE_KEY(currency)),
      fallback,
    )
    base = Math.round((storedOrDefaultRate * resolvedCoinValueMinor) / 100)
  }

  const result = Math.floor((base * (10000 + feeBps) + 5000) / 10000)
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new RangeError()
  }
  return result
}
