/**
 * Reads price-guard settings (enabled flag and tolerance in basis points),
 * falling back to safe defaults when stored values are missing or invalid.
 */
import { SettingsRepository } from "@/shared/settings-repository"

export const PRICE_GUARD_ENABLED_KEY = "guard:enabled"
export const PRICE_GUARD_TOLERANCE_KEY = "guard:tolerance_bps"
export const DEFAULT_GUARD_TOLERANCE_BPS = 200

export async function isPriceGuardEnabled(settings: SettingsRepository): Promise<boolean> {
  const raw = await settings.get(PRICE_GUARD_ENABLED_KEY)
  if (raw === null) {
    return true
  }
  return raw !== "false"
}

export async function readPriceGuardTolerance(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(PRICE_GUARD_TOLERANCE_KEY)
  if (raw === null) {
    return DEFAULT_GUARD_TOLERANCE_BPS
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || !Number.isSafeInteger(n) || n <= 0) {
    return DEFAULT_GUARD_TOLERANCE_BPS
  }
  return n
}
