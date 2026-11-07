/**
 * Port for fetching a game's catalogue from an external source, returning
 * domain Products so adapters translate reseller data at the boundary.
 */
import { Product } from "../domain/product"

export type CatalogueSource = (game: string) => Promise<readonly Product[]>
