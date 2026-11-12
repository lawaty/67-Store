/**
 * Treasury consumption value object enforcing non-empty identifiers and safe
 * integer milli-USDT/basis/WAC amounts for order cost records.
 */
export type TreasuryConsumption = {
  readonly id: string
  readonly orderId: string
  readonly usdtMilli: number
  readonly basisEgpMinor: number
  readonly wacEgpMinor: number
  readonly createdAt: string
}

export function treasuryConsumption(input: TreasuryConsumption): TreasuryConsumption {
  if (typeof input.id !== "string" || typeof input.orderId !== "string" || typeof input.createdAt !== "string") {
    throw new RangeError()
  }
  const id = input.id.trim()
  const orderId = input.orderId.trim()
  const createdAt = input.createdAt.trim()
  if (id.length === 0 || orderId.length === 0 || createdAt.length === 0) {
    throw new RangeError()
  }

  const { usdtMilli, basisEgpMinor, wacEgpMinor } = input

  if (!Number.isSafeInteger(usdtMilli) || usdtMilli <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(basisEgpMinor) || basisEgpMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(wacEgpMinor) || wacEgpMinor < 0) {
    throw new RangeError()
  }

  return Object.freeze({
    id,
    orderId,
    usdtMilli,
    basisEgpMinor,
    wacEgpMinor,
    createdAt,
  })
}
