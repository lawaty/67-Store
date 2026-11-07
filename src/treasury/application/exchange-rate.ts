/**
 * Reads the USD/EGP exchange rate from `rate:egp`, falling back to 48.5, and
 * converts USD money to EGP.
 */
import { SettingsRepository } from "@/shared/settings-repository"
import { Money, money } from "@/shared/money"

export const DEFAULT_EGP_RATE = 48.5
export const EGP_RATE_KEY = "rate:egp"

export async function readEgpRate(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(EGP_RATE_KEY)
  if (raw === null) {
    return DEFAULT_EGP_RATE
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_EGP_RATE
  }
  return n
}

export function toEgp(usd: Money, rate: number): Money {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError()
  }
  return money(Math.round(usd.minor * rate), "EGP")
}
