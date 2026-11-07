/**
 * Reads the treasury reconciliation tolerance from
 * `treasury:tolerance_usdt_minor`, falling back to 100 when missing/invalid.
 */
import { SettingsRepository } from "@/shared/settings-repository"

export const TREASURY_TOLERANCE_KEY = "treasury:tolerance_usdt_minor"
export const DEFAULT_TREASURY_TOLERANCE = 100

export async function readTreasuryTolerance(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(TREASURY_TOLERANCE_KEY)
  if (raw === null) {
    return DEFAULT_TREASURY_TOLERANCE
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || !Number.isSafeInteger(n) || n < 0) {
    return DEFAULT_TREASURY_TOLERANCE
  }
  return n
}
