/**
 * Refunds a failed order's charged coins to the wallet exactly once, marking
 * the order refunded only when a refund is applied.
 */
import { Order, apply } from "@/ordering"
import { OrderRepository } from "@/ordering"
import { WalletRepository } from "@/wallet"

export function createRefundOrder(deps: {
  orders: OrderRepository
  wallets: WalletRepository
  now: () => string
}): (order: Order) => Promise<Order> {
  return async (order: Order): Promise<Order> => {
    if (order.refundedAt !== null) {
      return order
    }
    if (order.coinsCharged === null || order.coinsCharged <= 0) {
      return order
    }
    if (order.status !== "FAILED") {
      return order
    }
    await deps.wallets.credit(order.client.id, order.coinsCharged, "refund:" + order.id)
    const transitioned = apply(order, "REFUNDED")
    const next = Object.freeze({
      id: transitioned.id,
      token: transitioned.token,
      client: transitioned.client,
      product: transitioned.product,
      player: transitioned.player,
      price: transitioned.price,
      status: transitioned.status,
      paymentReference: transitioned.paymentReference,
      distributorOrderId: transitioned.distributorOrderId,
      createdAt: transitioned.createdAt,
      discountMinor: transitioned.discountMinor,
      costMinor: transitioned.costMinor,
      promoCodeId: transitioned.promoCodeId,
      playerName: transitioned.playerName,
      wacEgpMinor: transitioned.wacEgpMinor,
      cogsEgpMinor: transitioned.cogsEgpMinor,
      tradingMarginMinor: transitioned.tradingMarginMinor,
      coinsCharged: transitioned.coinsCharged,
      coinValueMinor: transitioned.coinValueMinor,
      coinsConsumed: transitioned.coinsConsumed,
      markupBasisPoints: transitioned.markupBasisPoints,
      refundedAt: deps.now(),
    })
    await deps.orders.update(next)
    return next
  }
}