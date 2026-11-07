/**
 * Maps G2Bulk catalogue payloads into core catalogue Product entries,
 * converting distributor USD amounts to minor-unit Money values.
 */
import { money } from "../../shared/money"
import { product, Product } from "@/catalogue"

export type CatalogueItem = { readonly id: number; readonly name: string; readonly amount: number }

export function usdToMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError()
  }
  return Math.ceil(Number((amount * 100).toFixed(6)))
}

export function mapCatalogue(game: string, payload: unknown): Product[] {
  if (typeof payload !== "object" || payload === null) {
    throw new RangeError("payload")
  }
  const p = payload as Record<string, unknown>
  if (!Array.isArray(p.catalogues)) {
    throw new RangeError("catalogues")
  }
  const catalogues = p.catalogues as unknown[]
  const result: Product[] = []
  for (let i = 0; i < catalogues.length; i++) {
    const item = catalogues[i]
    if (typeof item !== "object" || item === null) {
      throw new RangeError("item")
    }
    const it = item as Record<string, unknown>
    if (typeof it.id !== "number" || typeof it.name !== "string" || typeof it.amount !== "number") {
      throw new RangeError("item")
    }
    result.push(
      product({
        id: `${game}:${it.id}`,
        distributorId: String(it.id),
        name: it.name,
        cost: money(usdToMinor(it.amount), "USD"),
        game,
      })
    )
  }
  return result
}
