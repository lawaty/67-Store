/**
 * Synchronizes a fulfilling order with distributor status, consuming treasury
 * on completion or refunding on failure.
 */
import { Order, apply } from "@/ordering"
import { OrderRepository } from "@/ordering"
import { Distributor } from "../ports/distributor"
import { FulfilmentError } from "../domain/fulfilment-error"
import type { TreasuryService } from "@/treasury"
import { usdtMilliFromUsdMinor } from "@/shared/usdt"
import { applyActualCost, resolveCostToConsumeUsdtMilli } from "./cost-to-consume"

export function createSyncFulfilment(deps: { orders: OrderRepository; distributor: Distributor; treasury: Pick<TreasuryService, "consumeForOrder">; refund: (order: Order) => Promise<Order> }): (order: Order) => Promise<Order> {
  return async (order: Order): Promise<Order> => {
    if (order.status !== "FULFILLING") {
      return order
    }
    if (!order.distributorOrderId) {
      throw new FulfilmentError("Order has no distributor order id")
    }
    const got = await deps.distributor.getOrder({ distributorOrderId: order.distributorOrderId!, game: order.product.game })
    if (got.status === "COMPLETED") {
      const catalogueCostUsdtMilli = order.costMinor == null ? null : usdtMilliFromUsdMinor(order.costMinor)
      const distributorPriceUsdtMilli = got.priceUsdtMilli ?? (got.priceMinor == null ? null : usdtMilliFromUsdMinor(got.priceMinor))
      const costToConsume = resolveCostToConsumeUsdtMilli(distributorPriceUsdtMilli, catalogueCostUsdtMilli)
      let actual = order
      if (costToConsume != null) {
        const consumption = await deps.treasury.consumeForOrder({
          orderId: order.id,
          costUsdtMilli: costToConsume,
        })
        actual = applyActualCost(order, costToConsume, consumption.basisEgpMinor)
      }
      const next = apply(actual, "DELIVERY_SUCCEEDED")
      await deps.orders.update(next)
      return next
    }
    if (got.status === "FAILED") {
      const next = apply(order, "DELIVERY_FAILED")
      await deps.orders.update(next)
      return await deps.refund(next)
    }
    return order
  }
}