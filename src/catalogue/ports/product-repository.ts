/**
 * Port for persisting and querying catalogue products, including upserts and
 * deactivating products no longer present in a synced catalogue.
 */
export interface ProductRepository {
  upsertMany(products: readonly Product[]): Promise<void>
  listActive(game: string): Promise<Product[]>
  listAll(game: string): Promise<Product[]>
  deactivateExcept(game: string, keepIds: readonly string[]): Promise<number>
  appendCostHistory(rows: readonly { productId: string; costMinor: number; currency: string }[]): Promise<void>
}

export type ProductCostChange = { productId: string; previousCostMinor: number; currentCostMinor: number }

export type CostHistoryReader = {
  listCostChangesSince(lastIndexedAt: string | null): Promise<readonly ProductCostChange[]>
  latestCostRecordedAt(): Promise<string | null>
}

import { Product } from "../domain/product"
