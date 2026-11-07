/**
 * Sandbox catalogue source selling only MLBB with four fixed USD products,
 * built through the domain product factory so they pass domain validation.
 */
import { CatalogueSource } from "@/catalogue"
import { product } from "@/catalogue"
import { money } from "../../shared/money"

const FIXED_SYNCED_AT = "2026-11-07T00:00:00.000Z"

export function createFakeCatalogueSource(): CatalogueSource {
  return async (game: string) => {
    if (game !== "mlbb") {
      return []
    }
    return [
      product({
        id: "mlbb:fake-86",
        distributorId: "fake-86",
        name: "86 جوهرة",
        cost: money(99, "USD"),
        game,
        active: true,
        syncedAt: new Date(FIXED_SYNCED_AT),
      }),
      product({
        id: "mlbb:fake-172",
        distributorId: "fake-172",
        name: "172 جوهرة",
        cost: money(199, "USD"),
        game,
        active: true,
        syncedAt: new Date(FIXED_SYNCED_AT),
      }),
      product({
        id: "mlbb:fake-257",
        distributorId: "fake-257",
        name: "257 جوهرة",
        cost: money(299, "USD"),
        game,
        active: true,
        syncedAt: new Date(FIXED_SYNCED_AT),
      }),
      product({
        id: "mlbb:fake-706",
        distributorId: "fake-706",
        name: "706 جوهرة",
        cost: money(799, "USD"),
        game,
        active: true,
        syncedAt: new Date(FIXED_SYNCED_AT),
      }),
    ]
  }
}
