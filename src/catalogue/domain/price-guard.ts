/**
 * Computes price drift in basis points and classifies a synced vs live price
 * as ok, held, or stale, treating currency mismatch or missing live data as stale.
 */
import { Money } from "../../shared/money"

export type PriceGuardResult =
  | { readonly status: "ok"; readonly driftBasisPoints: number }
  | { readonly status: "held"; readonly driftBasisPoints: number }
  | { readonly status: "stale" }

export function driftBasisPoints(syncedMinor: number, liveMinor: number): number {
  if (
    !Number.isSafeInteger(syncedMinor) ||
    syncedMinor <= 0 ||
    !Number.isSafeInteger(liveMinor) ||
    liveMinor < 0
  ) {
    throw new RangeError()
  }
  return Math.floor((Math.abs(liveMinor - syncedMinor) * 10000 + syncedMinor / 2) / syncedMinor)
}

export function guardPrice(
  synced: Money,
  live: Money | null,
  toleranceBasisPoints: number,
): PriceGuardResult {
  if (!Number.isSafeInteger(synced.minor) || synced.minor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(toleranceBasisPoints) || toleranceBasisPoints < 0) {
    throw new RangeError()
  }
  if (live !== null) {
    if (!Number.isSafeInteger(live.minor) || live.minor < 0) {
      throw new RangeError()
    }
  }

  if (live === null) {
    return { status: "stale" }
  }
  if (live.currency !== synced.currency) {
    return { status: "stale" }
  }

  const drift = driftBasisPoints(synced.minor, live.minor)
  if (drift <= toleranceBasisPoints) {
    return { status: "ok", driftBasisPoints: drift }
  }
  return { status: "held", driftBasisPoints: drift }
}
