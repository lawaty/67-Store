/**
 * Deposit value object and helpers: validates deposit records, converts
 * amount and rate to coins, and computes FX result in EGP minor units.
 */
import { CurrencyCode } from "../../shared/money"

export type Deposit = {
  readonly id: string
  readonly clientId: string
  readonly currency: CurrencyCode
  readonly amountMinor: number
  readonly rateMinor: number
  readonly coins: number
  readonly wacEgpMinor: number
  readonly egpValueMinor: number
  readonly createdAt: string
}

export function deposit(input: Deposit): Deposit {
  if (typeof input !== "object" || input === null) {
    throw new RangeError()
  }
  if (typeof input.id !== "string" || typeof input.clientId !== "string" || typeof input.createdAt !== "string") {
    throw new RangeError()
  }
  const id = input.id.trim()
  const clientId = input.clientId.trim()
  const createdAt = input.createdAt.trim()
  if (id.length === 0 || clientId.length === 0 || createdAt.length === 0) {
    throw new RangeError()
  }

  const { currency, amountMinor, rateMinor, coins, wacEgpMinor, egpValueMinor } = input

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(rateMinor) || rateMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(coins) || coins <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(wacEgpMinor) || wacEgpMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(egpValueMinor) || egpValueMinor < 0) {
    throw new RangeError()
  }

  return Object.freeze({
    id,
    clientId,
    currency,
    amountMinor,
    rateMinor,
    coins,
    wacEgpMinor,
    egpValueMinor,
    createdAt,
  })
}

export function coinsForDeposit(amountMinor: number, rateMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(rateMinor) || rateMinor <= 0) {
    throw new RangeError()
  }
  const result = Math.floor(amountMinor / rateMinor)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}

export function fxResultEgpMinor(d: Pick<Deposit, "coins" | "wacEgpMinor" | "egpValueMinor">): number {
  if (typeof d !== "object" || d === null) {
    throw new RangeError()
  }
  const { coins, wacEgpMinor, egpValueMinor } = d
  const product = coins * wacEgpMinor
  const result = egpValueMinor - product
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
