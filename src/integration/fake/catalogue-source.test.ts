import { describe, expect, it } from "vitest"
import { createFakeCatalogueSource } from "./catalogue-source"
import { product } from "@/catalogue"

describe("createFakeCatalogueSource", () => {
  it("returns the four fake mlbb products with exact ids, costs and currency", async () => {
    const source = createFakeCatalogueSource()
    const products = await source("mlbb")
    expect(products).toHaveLength(4)
    expect(products.map((p) => p.id)).toEqual([
      "mlbb:fake-86",
      "mlbb:fake-172",
      "mlbb:fake-257",
      "mlbb:fake-706",
    ])
    expect(products.map((p) => p.distributorId)).toEqual([
      "fake-86",
      "fake-172",
      "fake-257",
      "fake-706",
    ])
    expect(products.map((p) => p.name)).toEqual(["86 جوهرة", "172 جوهرة", "257 جوهرة", "706 جوهرة"])
    expect(products.map((p) => p.cost.minor)).toEqual([99, 199, 299, 799])
    for (const p of products) {
      expect(p.cost.currency).toBe("USD")
      expect(p.game).toBe("mlbb")
      expect(p.active).toBe(true)
      expect(p.syncedAt?.toISOString()).toBe("2026-11-07T00:00:00.000Z")
    }
  })

  it("gives every id a game prefix and unique ids, matching listActive expectations", async () => {
    const source = createFakeCatalogueSource()
    const products = await source("mlbb")
    const ids = products.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of products) {
      expect(p.id.startsWith("mlbb:")).toBe(true)
      expect(p.id).toBe(`${p.game}:${p.distributorId}`)
    }
  })

  it("returns an empty list for any other game", async () => {
    const source = createFakeCatalogueSource()
    expect(await source("other-game")).toEqual([])
    expect(await source("")).toEqual([])
  })

  it("returned products pass the domain product factory", async () => {
    const source = createFakeCatalogueSource()
    const products = await source("mlbb")
    for (const p of products) {
      expect(() =>
        product({
          id: p.id,
          distributorId: p.distributorId,
          name: p.name,
          cost: p.cost,
          game: p.game,
          active: p.active,
          syncedAt: p.syncedAt,
        }),
      ).not.toThrow()
    }
  })
})
