/**
 * Defines promo code normalization and redemption rules, validating activity, expiry, and usage limits while computing discounts in integer minor units.
 */
import { Money, money } from "../shared/money"

export type PromoKind = "PERCENT" | "FIXED"

export type PromoCode = {
  readonly id: string
  readonly code: string
  readonly kind: PromoKind
  readonly basisPoints: number | null
  readonly amountMinor: number | null
  readonly maxUses: number | null
  readonly uses: number
  readonly active: boolean
  readonly expiresAt: string | null
}

export function normalizeCode(input: string): string {
  const normalized = input.trim().replace(/\s+/g, " ").toUpperCase()
  if (normalized.length === 0) {
    throw new RangeError()
  }
  return normalized
}

export function isRedeemable(p: PromoCode, now: string): boolean {
  if (!p.active) {
    return false
  }
  if (p.expiresAt !== null && p.expiresAt <= now) {
    return false
  }
  if (p.maxUses !== null && p.uses >= p.maxUses) {
    return false
  }
  return true
}

export function discountFor(input: { price: Money; cost: Money | null; promo: PromoCode }): Money {
  let discountMinor: number
  if (input.promo.kind === "PERCENT") {
    const bp = input.promo.basisPoints
    if (bp === null || !Number.isSafeInteger(bp) || bp < 1 || bp > 10000) {
      throw new RangeError()
    }
    discountMinor = Math.floor((input.price.minor * bp + 5000) / 10000)
  } else if (input.promo.kind === "FIXED") {
    const amountMinor = input.promo.amountMinor
    if (amountMinor === null || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new RangeError()
    }
    discountMinor = Math.min(amountMinor, input.price.minor)
  } else {
    throw new RangeError()
  }

  if (input.cost !== null) {
    const cost = input.cost
    if (cost.currency !== input.price.currency) {
      throw new TypeError()
    }
    discountMinor = Math.min(discountMinor, input.price.minor - cost.minor)
  }

  if (discountMinor < 0) {
    discountMinor = 0
  }

  return money(discountMinor, input.price.currency)
}
