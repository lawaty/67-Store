/**
 * Funding lot value object: every lot carries the total EGP paid (including
 * fees) alongside the received USDT in milli-USDT. WAC is derived as
 * egpPaidMinor * 1000 / usdtMilli (EGP minor per 1 USDT). All invariants use safe integers.
 */
export { inferredEgpPerUsdtMinor } from "@/shared/funding"

export type Funding = {
  readonly id: string
  readonly egpPaidMinor: number
  readonly usdtMilli: number
  readonly createdAt: string
}

function normalizeIdCreated(input: { id: string; createdAt: string }): { id: string; createdAt: string } {
  if (typeof input.id !== "string" || typeof input.createdAt !== "string") {
    throw new RangeError()
  }
  const id = input.id.trim()
  const createdAt = input.createdAt.trim()
  if (id.length === 0 || createdAt.length === 0) {
    throw new RangeError()
  }
  return { id, createdAt }
}

function assertAmounts(input: {
  egpPaidMinor: number
  usdtMilli: number
}): void {
  if (!Number.isSafeInteger(input.egpPaidMinor) || input.egpPaidMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(input.usdtMilli) || input.usdtMilli <= 0) {
    throw new RangeError()
  }
}

export function funding(input: Funding): Funding {
  const { id, createdAt } = normalizeIdCreated(input)
  assertAmounts(input)

  const { egpPaidMinor, usdtMilli } = input

  return Object.freeze({
    id,
    egpPaidMinor,
    usdtMilli,
    createdAt,
  })
}
