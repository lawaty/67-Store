import { restateCost, type Order } from "@/ordering"

export function resolveCostToConsumeUsdtMilli(
  distributorPriceUsdtMilli: number | null | undefined,
  catalogueCostUsdtMilli: number | null | undefined,
): number | null {
  if (catalogueCostUsdtMilli == null) return null
  const accepted =
    typeof distributorPriceUsdtMilli === "number" &&
    Number.isFinite(distributorPriceUsdtMilli) &&
    Number.isSafeInteger(distributorPriceUsdtMilli) &&
    distributorPriceUsdtMilli > 0 &&
    Number.isFinite(catalogueCostUsdtMilli) &&
    Number.isSafeInteger(catalogueCostUsdtMilli) &&
    catalogueCostUsdtMilli > 0 &&
    Math.abs(distributorPriceUsdtMilli - catalogueCostUsdtMilli) <= Math.max(50, Math.floor(catalogueCostUsdtMilli * 0.10))
  return accepted ? distributorPriceUsdtMilli : catalogueCostUsdtMilli
}

/**
 * Applies the distributor's actual debit to the order's financial snapshot.
 * Returns the order unchanged when the cost already matches, or when the
 * margin would be negative.
 */
export function applyActualCost(order: Order, costUsdtMilli: number, basisEgpMinor: number): Order {
  const costMinor = Math.round(costUsdtMilli / 10)
  const cogs = basisEgpMinor
  const tradingMarginMinor = order.price.minor - costMinor
  if (tradingMarginMinor < 0) return order
  if (costMinor === order.costMinor && cogs === order.cogsEgpMinor && costUsdtMilli === (order.costUsdtMilli ?? null)) return order
  return restateCost(order, {
    costMinor,
    costUsdtMilli,
    cogsEgpMinor: cogs,
    tradingMarginMinor,
  })
}
