/**
 * Places an order by quoting price, applying an optional promo, snapshotting
 * WAC/COGS and margin, then persisting the new order.
 */
import { Client } from "@/accounts"
import { Product } from "@/catalogue"
import { Markup } from "../domain/pricing"
import { Player } from "../domain/player"
import { Order, order } from "../domain/order"
import { OrderRepository } from "../ports/order-repository"
import { quote } from "../domain/quote"
import { PromoRepository } from "@/promos"
import { PromoCode, discountFor } from "@/promos"
import { money } from "../../shared/money"
import { cogsEgpMinor } from "@/treasury"
export function createPlaceOrder(deps: {
  orders: OrderRepository
  newId: () => string
  newToken: () => string
  promos: PromoRepository
  now: () => string
  wac: () => Promise<number>
}): (input: {
  client: Client
  product: Product
  player: Player
  markup: Markup
  coinValueMinor: number
  promoCode: string | null
  playerName?: string | null
}) => Promise<{
  order: Order
  promoError: "unknown" | "inactive" | "expired" | "exhausted" | null
}> {
  return async (input: {
    client: Client
    product: Product
    player: Player
    markup: Markup
    coinValueMinor: number
    promoCode: string | null
    playerName?: string | null
  }): Promise<{
    order: Order
    promoError: "unknown" | "inactive" | "expired" | "exhausted" | null
  }> => {
    const id = deps.newId()
    const price = quote(input.product.cost, input.markup)

    let promo: PromoCode | null = null
    let promoError: "unknown" | "inactive" | "expired" | "exhausted" | null = null

    if (input.promoCode !== null) {
      const result = await deps.promos.redeem({
        code: input.promoCode,
        orderId: id,
        clientId: input.client.id,
        now: deps.now(),
      })
      if (result.ok) {
        promo = result.promo
      } else {
        promoError = result.reason
      }
    }

    let finalPrice = price
    let discountMinor: number | undefined
    let promoCodeId: string | null | undefined

    if (promo !== null) {
      const discount = discountFor({ price, cost: input.product.cost, promo })
      finalPrice = money(price.minor - discount.minor, price.currency)
      discountMinor = discount.minor
      promoCodeId = promo.id
    }

    const wacEgpMinor = await deps.wac()
    const cogsEgpMinorValue = cogsEgpMinor(input.product.cost.minor, wacEgpMinor)
    const tradingMarginMinor = finalPrice.minor - input.product.cost.minor

    const o = order({
      id,
      token: deps.newToken(),
      client: input.client,
      product: input.product,
      player: input.player,
      price: finalPrice,
      costMinor: input.product.cost.minor,
      discountMinor,
      promoCodeId,
      playerName: input.playerName,
      wacEgpMinor,
      cogsEgpMinor: cogsEgpMinorValue,
      tradingMarginMinor,
      coinValueMinor: input.coinValueMinor,
      markupBasisPoints: input.markup.basisPoints,
    })
    await deps.orders.save(o)
    return { order: o, promoError }
  }
}
