/**
 * Reads and presents an order as an API DTO for the boundary.
 * Resolves the promo code and converts price/discount to EGP using the current treasury rate.
 */
import type { Container } from "@/container"
import type { Order } from "@/ordering"
import { readEgpRate, toEgp } from "@/treasury"
import { money } from "@/shared/money"
import type { OrderDto } from "./contracts"

export async function readOrder(c: Container, token: string): Promise<OrderDto | null> {
  const order = await c.orders.findByToken(token)
  if (order === null) return null

  const promos = await c.promos.listAll()
  const promoCode =
    order.promoCodeId === null || order.promoCodeId === undefined
      ? null
      : promos.find((promo) => promo.id === order.promoCodeId)?.code ?? order.promoCodeId

  return presentOrder(order, await readEgpRate(c.settings), promoCode)
}

export function presentOrder(order: Order, rate: number, promoCode: string | null): OrderDto {
  const discountEgp =
    order.discountMinor !== undefined && order.discountMinor !== null && order.discountMinor > 0
      ? toEgp(money(order.discountMinor, order.price.currency), rate)
      : null

  return {
    token: order.token,
    status: order.status,
    productName: order.product.name,
    player: {
      userId: order.player.userId,
      serverId: order.player.serverId,
    },
    price: order.price,
    egp: toEgp(order.price, rate),
    discountEgp,
    promoCode,
    playerName: order.playerName ?? null,
  }
}
