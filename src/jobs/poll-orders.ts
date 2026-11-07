/**
 * Polls fulfilling orders in batches and syncs each with fulfilment, returning
 * checked, updated, and failed counts per run.
 */
import { Order } from "@/ordering"
import { OrderRepository } from "@/ordering"

export function createPollOrders(deps: {
  orders: OrderRepository
  syncFulfilment: (order: Order) => Promise<Order>
}): () => Promise<{ checked: number; updated: number; failed: number }> {
  return async () => {
    const orders = await deps.orders.listByStatus("FULFILLING", 100)
    let checked = 0
    let updated = 0
    let failed = 0
    for (const order of orders) {
      checked++
      try {
        const result = await deps.syncFulfilment(order)
        if (result.status !== order.status) {
          updated++
        }
      } catch {
        failed++
      }
    }
    return { checked, updated, failed }
  }
}
