/**
 * Fulfils a paid order through the distributor, records treasury consumption on
 * delivery, and triggers a refund when delivery fails.
 */
import { Order, apply, attachDistributorOrder } from "@/ordering"
import { OrderRepository } from "@/ordering"
import { Distributor } from "../ports/distributor"
import { FulfilmentError } from "../domain/fulfilment-error"
import type { TreasuryService } from "@/treasury"

export function createFulfilOrder(deps: { orders: OrderRepository; distributor: Distributor; treasury: Pick<TreasuryService, "consumeForOrder">; refund: (order: Order) => Promise<Order> }): (order: Order) => Promise<Order> {
  return async (order: Order): Promise<Order> => {
    if (order.status !== "PAID") {
      throw new FulfilmentError(`Cannot fulfil an order in ${order.status}`)
    }
    const placed = await deps.distributor.placeOrder({ orderId: order.id, game: order.product.game, product: order.product, player: order.player })
    let base = apply(order, "FULFILMENT_STARTED")
    if (placed.distributorOrderId !== "") {
      base = attachDistributorOrder(base, placed.distributorOrderId)
    }
    let next = base
    if (placed.status === "COMPLETED") {
      next = apply(base, "DELIVERY_SUCCEEDED")
    } else if (placed.status === "FAILED") {
      next = apply(base, "DELIVERY_FAILED")
    }
    await deps.orders.update(next)
    if (next.status === "DELIVERED" && order.costMinor != null) {
      await deps.treasury.consumeForOrder({ orderId: order.id, costUsdtMinor: order.costMinor, wacEgpMinor: order.wacEgpMinor ?? 0, cogsEgpMinor: order.cogsEgpMinor ?? 0 })
    }
    if (next.status === "FAILED") {
      next = await deps.refund(next)
    }
    return next
  }
}