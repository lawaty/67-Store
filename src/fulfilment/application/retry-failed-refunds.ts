/**
 * Retries coin refunds for failed orders whose refund never completed.
 */
import { Order } from "@/ordering"
import { OrderRepository } from "@/ordering"

export function createRetryFailedRefunds(deps: {
  orders: Pick<OrderRepository, "listFailedUnrefundedCoinOrders">
  refund: (order: Order) => Promise<Order>
}): (limit?: number) => Promise<{ checked: number; refunded: number; failed: number }> {
  return async (limit = 100) => {
    const orders = await deps.orders.listFailedUnrefundedCoinOrders(limit)
    let checked = 0
    let refunded = 0
    let failed = 0
    for (const order of orders) {
      checked++
      try {
        const result = await deps.refund(order)
        if (result.status === "REFUNDED" || result.refundedAt !== null) {
          refunded++
        }
      } catch {
        failed++
      }
    }
    return { checked, refunded, failed }
  }
}
