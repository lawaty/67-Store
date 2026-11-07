/**
 * Checks a product's synced cost against live catalogue data, returning
 * ok/held/stale and recording alerts when drift exceeds tolerance or data is stale.
 */
import { Product } from "../domain/product"
import { CatalogueSource } from "../ports/catalogue-source"
import { guardPrice } from "../domain/price-guard"
import { AlertRepository } from "@/alerts"

export type PriceCheckResult =
  | { readonly status: "ok" }
  | { readonly status: "held"; readonly driftBasisPoints: number }
  | { readonly status: "stale" }

export function createPriceCheck(deps: {
  fetchCatalogue: CatalogueSource
  toleranceBasisPoints: number
  enabled: boolean
  alerts: Pick<AlertRepository, "append">
}): (product: Product) => Promise<PriceCheckResult> {
  return async (product: Product): Promise<PriceCheckResult> => {
    if (!deps.enabled) {
      return { status: "ok" }
    }

    const staleMessage = `stale catalogue for ${product.game}/${product.distributorId}`

    let catalogue: readonly Product[]
    try {
      catalogue = await deps.fetchCatalogue(product.game)
    } catch {
      await deps.alerts.append({ kind: "price_guard", message: staleMessage })
      return { status: "stale" }
    }

    if (catalogue.length === 0) {
      await deps.alerts.append({ kind: "price_guard", message: staleMessage })
      return { status: "stale" }
    }

    const live = catalogue.find(
      (candidate) => candidate.distributorId === product.distributorId && candidate.game === product.game,
    )
    if (live === undefined) {
      await deps.alerts.append({ kind: "price_guard", message: staleMessage })
      return { status: "stale" }
    }

    const result = guardPrice(product.cost, live.cost, deps.toleranceBasisPoints)
    if (result.status === "ok") {
      return { status: "ok" }
    }
    if (result.status === "held") {
      await deps.alerts.append({
        kind: "price_guard",
        message: `price drift ${result.driftBasisPoints} bps for ${product.game}/${product.distributorId}`,
      })
      return { status: "held", driftBasisPoints: result.driftBasisPoints }
    }

    await deps.alerts.append({ kind: "price_guard", message: staleMessage })
    return { status: "stale" }
  }
}
