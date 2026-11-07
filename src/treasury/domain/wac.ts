/**
 * Weighted average cost (WAC) logic: EGP minor per coin as total basis over
 * total USDT rounded half-up, zero when empty, plus COGS and fund/consume.
 */
import { Funding } from "./funding"

export type TreasuryState = {
  readonly usdtMinor: number
  readonly basisEgpMinor: number
}

export const emptyTreasury: TreasuryState = Object.freeze({
  usdtMinor: 0,
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
 * EGP paid and USDT received, so this is mathematically the same as
 * `(prevUsdt × prevWac + egpPaid) / (prevUsdt + usdtReceived)`.
 */
export function wacEgpMinor(state: TreasuryState): number {
  if (!Number.isSafeInteger(state.usdtMinor) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  if (state.usdtMinor === 0) {
    return 0
  }
  const numerator = state.basisEgpMinor * 100
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return roundHalfUp(numerator, state.usdtMinor)
}

export function cogsEgpMinor(costUsdtMinor: number, wacEgpMinor: number): number {
  if (!Number.isSafeInteger(costUsdtMinor) || !Number.isSafeInteger(wacEgpMinor)) {
    throw new RangeError()
  }
  const numerator = costUsdtMinor * wacEgpMinor
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return roundHalfUp(numerator, 100)
}

export function fund(state: TreasuryState, lot: Funding): TreasuryState {
  if (!Number.isSafeInteger(state.usdtMinor) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  const usdtMinor = state.usdtMinor + lot.usdtMinor
  const basisEgpMinor = state.basisEgpMinor + lot.egpPaidMinor
  if (!Number.isSafeInteger(usdtMinor) || !Number.isSafeInteger(basisEgpMinor)) {
    throw new RangeError()
  }
  return Object.freeze({ usdtMinor, basisEgpMinor })
}

export function consume(state: TreasuryState, usdtMinor: number): TreasuryState {
  if (!Number.isSafeInteger(state.usdtMinor) || !Number.isSafeInteger(state.basisEgpMinor)) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(usdtMinor)) {
    throw new RangeError()
  }
  if (usdtMinor > state.usdtMinor) {
    throw new RangeError()
  }
  const wac = wacEgpMinor(state)
  const cost = cogsEgpMinor(usdtMinor, wac)
  const newUsdt = state.usdtMinor - usdtMinor
  const newBasis = state.basisEgpMinor - cost
  if (!Number.isSafeInteger(newUsdt) || !Number.isSafeInteger(newBasis)) {
    throw new RangeError()
  }
  return Object.freeze({ usdtMinor: newUsdt, basisEgpMinor: newBasis })
}

export function freeUsdtMinor(liveUsdtMinor: number | null, recordedUsdtMinor: number): number {
  if (liveUsdtMinor === null) {
    return 0
  }
  return Math.max(0, liveUsdtMinor - recordedUsdtMinor)
}

export function availableUsdtMinor(recordedUsdtMinor: number, reservedUsdtMinor: number): number {
  if (!Number.isSafeInteger(recordedUsdtMinor) || !Number.isSafeInteger(reservedUsdtMinor)) {
    throw new RangeError()
  }
  const result = recordedUsdtMinor - reservedUsdtMinor
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
