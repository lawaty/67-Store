/**
 * Weighted average cost (WAC) logic: EGP minor per 1 USDT as total basis over
 * total USDT in milli-USDT, rounded half-up, zero when empty, plus COGS and fund/consume.
 */
import { USDT_MILLI_PER_USDT } from "@/shared/usdt"
import { Funding } from "./funding"

export type TreasuryState = {
  readonly usdtMilli: number
  readonly basisEgpMinor: number
}

export const emptyTreasury: TreasuryState = Object.freeze({
  usdtMilli: 0,
  basisEgpMinor: 0,
})

function roundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError()
  }
  const result = Math.floor((numerator + denominator / 2) / denominator)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}

/**
 * Weighted average over every remaining lot: `fund()` accumulates each lot's
 * EGP paid and milli-USDT received, so this is mathematically the same as
 * `(prevUsdt × prevWac + egpPaid) / (prevUsdt + usdtReceived)` expressed in
 * EGP minor per 1 USDT.
 */
export function wacEgpMinor(state: TreasuryState): number {
  if (!Number.isSafeInteger(state.usdtMilli) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  if (state.usdtMilli === 0) {
    return 0
  }
  const numerator = state.basisEgpMinor * USDT_MILLI_PER_USDT
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return roundHalfUp(numerator, state.usdtMilli)
}

export function cogsEgpMinor(costUsdtMilli: number, wacEgpMinor: number): number {
  if (!Number.isSafeInteger(costUsdtMilli) || !Number.isSafeInteger(wacEgpMinor)) {
    throw new RangeError()
  }
  const numerator = costUsdtMilli * wacEgpMinor
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return roundHalfUp(numerator, USDT_MILLI_PER_USDT)
}

/**
 * Exact pro-rata EGP basis for `costUsdtMilli` of the current treasury.
 * This is the one correct basis debit for a consumption: a single rounding
 * point from the live totals, with no intermediate rounded-WAC step.
 *
 * When `costUsdtMilli === state.usdtMilli` this returns `state.basisEgpMinor`
 * exactly, so draining the treasury always leaves zero basis.
 */
export function proRataBasisEgpMinor(costUsdtMilli: number, state: TreasuryState): number {
  if (!Number.isSafeInteger(costUsdtMilli) || costUsdtMilli <= 0) {
    throw new RangeError()
  }
  if (costUsdtMilli > state.usdtMilli) {
    throw new RangeError()
  }
  const numerator = costUsdtMilli * state.basisEgpMinor
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return roundHalfUp(numerator, state.usdtMilli)
}

export function fund(state: TreasuryState, lot: Funding): TreasuryState {
  if (!Number.isSafeInteger(state.usdtMilli) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  const usdtMilli = state.usdtMilli + lot.usdtMilli
  const basisEgpMinor = state.basisEgpMinor + lot.egpPaidMinor
  if (!Number.isSafeInteger(usdtMilli) || !Number.isSafeInteger(basisEgpMinor)) {
    throw new RangeError()
  }
  return Object.freeze({ usdtMilli, basisEgpMinor })
}

export function consume(state: TreasuryState, usdtMilli: number): TreasuryState {
  if (!Number.isSafeInteger(state.usdtMilli) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(usdtMilli)) {
    throw new RangeError()
  }
  if (usdtMilli > state.usdtMilli) {
    throw new RangeError()
  }
  const cost = proRataBasisEgpMinor(usdtMilli, state)
  const newUsdt = state.usdtMilli - usdtMilli
  const newBasis = state.basisEgpMinor - cost
  if (!Number.isSafeInteger(newUsdt) || !Number.isSafeInteger(newBasis)) {
    throw new RangeError()
  }
  return Object.freeze({ usdtMilli: newUsdt, basisEgpMinor: newBasis })
}

export function freeUsdtMilli(liveUsdtMilli: number | null, recordedUsdtMilli: number): number {
  if (liveUsdtMilli === null) {
    return 0
  }
  return Math.max(0, liveUsdtMilli - recordedUsdtMilli)
}

export function availableUsdtMilli(recordedUsdtMilli: number, reservedUsdtMilli: number): number {
  if (!Number.isSafeInteger(recordedUsdtMilli) || !Number.isSafeInteger(reservedUsdtMilli)) {
    throw new RangeError()
  }
  const result = recordedUsdtMilli - reservedUsdtMilli
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
