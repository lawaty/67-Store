/**
 * Syncs a game's catalogue by upserting fetched products and deactivating
 * missing ones, refusing to sync when the fetched catalogue is empty.
 */
import { Product } from "../domain/product"
import { ProductRepository } from "../ports/product-repository"
import { CatalogueSource } from "../ports/catalogue-source"

export function createCatalogueSync(deps: {
  products: ProductRepository
  fetchCatalogue: CatalogueSource
  afterHistory?: () => Promise<void>
}): (game: string) => Promise<{ synced: number; deactivated: number }> {
  return async (game: string) => {
    const products = await deps.fetchCatalogue(game)
    if (products.length === 0) {
      throw new RangeError("Refusing to sync an empty catalogue")
    }
    await deps.products.upsertMany(products)
    const deactivated = await deps.products.deactivateExcept(
      game,
      products.map((p) => p.id)
    )
    await deps.products.appendCostHistory(
      products.map((p) => ({ productId: p.id, costMinor: p.cost.minor, currency: p.cost.currency }))
    )
    if (deps.afterHistory) {
      await deps.afterHistory()
    }
    return { synced: products.length, deactivated }
  }
}
