import { describe, it, expect, vi } from "vitest"
import { createCatalogueSync } from "./sync-catalogue"
import { ProductRepository } from "../ports/product-repository"
import { Product } from "../domain/product"
import { money } from "@/shared/money"
import { product } from "../domain/product"

function createFakeRepo(): ProductRepository & {
  calls: {
    upsertMany: Product[][]
    deactivateExcept: Array<[string, readonly string[]]>
    appendCostHistory: Array<Array<{ productId: string; costMinor: number; currency: string }>>
  }
} {
  const calls = {
    upsertMany: [] as Product[][],
    deactivateExcept: [] as Array<[string, readonly string[]]>,
    appendCostHistory: [] as Array<Array<{ productId: string; costMinor: number; currency: string }>>,
  }
  return {
    calls,
    upsertMany: vi.fn(async (products: readonly Product[]) => {
      calls.upsertMany.push([...products])
    }),
    listActive: vi.fn(async () => []),
    listAll: vi.fn(async () => []),
    deactivateExcept: vi.fn(async (game: string, keepIds: readonly string[]) => {
      calls.deactivateExcept.push([game, keepIds])
      return 2
    }),
    appendCostHistory: vi.fn(async (rows: readonly { productId: string; costMinor: number; currency: string }[]) => {
      calls.appendCostHistory.push(rows.map((r) => ({ ...r })))
    }),
  }
}

describe("createCatalogueSync", () => {
  it("calls fetchCatalogue with the given game code", async () => {
    const productsRepo = createFakeRepo()
    const p1 = product({ id: "ff:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn(async () => [p1])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await sync("ff")
    expect(fetchCatalogue).toHaveBeenCalledWith("ff")
  })

  it("passes every returned product to upsertMany and appends one cost history row per fetched product", async () => {
    const productsRepo = createFakeRepo()
    const p1 = product({ id: "ff:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const p2 = product({ id: "ff:2", distributorId: "2", name: "200 Gems", cost: money(146, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn(async () => [p1, p2])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await sync("ff")
    expect(productsRepo.upsertMany).toHaveBeenCalledTimes(1)
    expect(productsRepo.upsertMany).toHaveBeenCalledWith([p1, p2])
    expect(productsRepo.appendCostHistory).toHaveBeenCalledTimes(1)
    expect(productsRepo.calls.appendCostHistory[0]).toEqual([
      { productId: "ff:1", costMinor: 73, currency: "USD" },
      { productId: "ff:2", costMinor: 146, currency: "USD" },
    ])
  })

  it("returns { synced: n } matching the number of products", async () => {
    const productsRepo = createFakeRepo()
    const p1 = product({ id: "ff:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn(async () => [p1])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    const result = await sync("ff")
    expect(result).toEqual({ synced: 1, deactivated: 2 })
  })

  it("when fetchCatalogue rejects, the error propagates and upsertMany and appendCostHistory are never called", async () => {
    const productsRepo = createFakeRepo()
    const err = new Error("boom")
    const fetchCatalogue = vi.fn(async () => {
      throw err
    })
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await expect(sync("ff")).rejects.toBe(err)
    expect(productsRepo.upsertMany).not.toHaveBeenCalled()
    expect(productsRepo.appendCostHistory).not.toHaveBeenCalled()
  })

  it("an empty catalogue rejects with the message \"refusing to sync\" and upsertMany, deactivateExcept, and appendCostHistory are never called", async () => {
    const productsRepo = createFakeRepo()
    const fetchCatalogue = vi.fn(async () => [])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await expect(sync("ff")).rejects.toBeInstanceOf(RangeError)
    await expect(sync("ff")).rejects.toThrow("Refusing to sync an empty catalogue")
    expect(productsRepo.upsertMany).not.toHaveBeenCalled()
    expect(productsRepo.deactivateExcept).not.toHaveBeenCalled()
    expect(productsRepo.appendCostHistory).not.toHaveBeenCalled()
  })

  it("an empty catalogue throws a RangeError and neither upsertMany, deactivateExcept, nor appendCostHistory is called", async () => {
    const productsRepo = createFakeRepo()
    const fetchCatalogue = vi.fn(async () => [])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await expect(sync("ff")).rejects.toBeInstanceOf(RangeError)
    await expect(sync("ff")).rejects.toThrow("Refusing to sync an empty catalogue")
    expect(productsRepo.upsertMany).not.toHaveBeenCalled()
    expect(productsRepo.deactivateExcept).not.toHaveBeenCalled()
    expect(productsRepo.appendCostHistory).not.toHaveBeenCalled()
  })

  it("deactivateExcept receives the game and exactly the ids that were synced", async () => {
    const productsRepo = createFakeRepo()
    const p1 = product({ id: "mlbb:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const p2 = product({ id: "mlbb:2", distributorId: "2", name: "200 Gems", cost: money(146, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn(async () => [p1, p2])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    await sync("mlbb")
    expect(productsRepo.deactivateExcept).toHaveBeenCalledTimes(1)
    expect(productsRepo.calls.deactivateExcept[0][0]).toBe("mlbb")
    expect(productsRepo.calls.deactivateExcept[0][1]).toEqual(["mlbb:1", "mlbb:2"])
  })

  it("the returned object carries the deactivated count from the repository", async () => {
    const productsRepo = createFakeRepo()
    productsRepo.deactivateExcept = vi.fn(async () => 5)
    const p1 = product({ id: "mlbb:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn(async () => [p1])
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue })
    const result = await sync("mlbb")
    expect(result).toEqual({ synced: 1, deactivated: 5 })
  })

  it("calls afterHistory only after appendCostHistory on success", async () => {
    const productsRepo = createFakeRepo()
    const p1 = product({ id: "mlbb:1", distributorId: "1", name: "100 Gems", cost: money(73, "USD"), game: "mlbb" })
    const order: string[] = []
    productsRepo.appendCostHistory = vi.fn(async () => {
      order.push("history")
    })
    const afterHistory = vi.fn(async () => {
      order.push("after")
    })
    const sync = createCatalogueSync({ products: productsRepo, fetchCatalogue: vi.fn(async () => [p1]), afterHistory })

    await sync("mlbb")

    expect(order).toEqual(["history", "after"])
    expect(afterHistory).toHaveBeenCalledTimes(1)
  })

  it("does not call afterHistory on empty catalogue or when fetch fails", async () => {
    const afterHistory = vi.fn(async () => {})
    const emptySync = createCatalogueSync({
      products: createFakeRepo(),
      fetchCatalogue: vi.fn(async () => []),
      afterHistory,
    })
    await expect(emptySync("mlbb")).rejects.toBeInstanceOf(RangeError)

    const err = new Error("boom")
    const failedSync = createCatalogueSync({
      products: createFakeRepo(),
      fetchCatalogue: vi.fn(async () => {
        throw err
      }),
      afterHistory,
    })
    await expect(failedSync("mlbb")).rejects.toBe(err)

    expect(afterHistory).not.toHaveBeenCalled()
  })
})
