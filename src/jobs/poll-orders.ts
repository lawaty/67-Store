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
  const BATCH = 100
  const MAX_BATCHES = 10
  return async () => {
    let checked = 0
    let updated = 0
    let failed = 0
    // orders that stay FULFILLING are paged past within a run, and the cap bounds a single run so a persistent backlog cannot hang the job.
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const orders = await deps.orders.listByStatus("FULFILLING", BATCH, batch * BATCH)
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
      if (orders.length < BATCH) break
    }
    return { checked, updated, failed }
  }
}
