/**
 * Computes sell price by applying a basis-point markup to product cost in its
 * money currency, rounding half-up to minor units.
 */
import { Money, money } from "../../shared/money"

export type Markup = { readonly basisPoints: number }

export function markup(basisPoints: number): Markup {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError()
  }
  return { basisPoints }
}

export function sellPrice(cost: Money, m: Markup): Money {
  const numerator = cost.minor * (10000 + m.basisPoints)
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  return money(Math.floor((numerator + 5000) / 10000), cost.currency)
}
