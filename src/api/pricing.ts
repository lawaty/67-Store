/**
 * Computes a product's quoted price, EGP amount, and coin cost.
 * Applies markup and derives coins from the USD price at the coin index value.
 */
import type { Money } from "@/shared/money"
import type { Markup } from "@/ordering"
import { quote } from "@/ordering"
import { coinsForUsdMinor } from "@/treasury"
import { toEgp } from "@/treasury"

export type PricedProduct = {
  readonly price: Money
  readonly egp: Money
  readonly coins: number
}

export function priceProduct(
  cost: Money,
  markup: Markup,
  egpRate: number,
  coinValueMinor: number,
): PricedProduct {
  const price = quote(cost, markup)
  const egp = toEgp(price, egpRate)
  const coins = coinsForUsdMinor(price.minor, coinValueMinor)
  return { price, egp, coins }
}