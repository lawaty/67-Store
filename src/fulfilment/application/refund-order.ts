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
    await deps.wallets.credit(order.client.id, order.coinsCharged, "refund:" + order.id, "refund:" + order.id)
    const transitioned = apply(order, "REFUNDED")
    const next = Object.freeze({
      ...transitioned,
      refundedAt: deps.now(),
    })
    await deps.orders.update(next)
    return next
  }
}