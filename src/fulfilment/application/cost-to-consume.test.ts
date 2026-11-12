import { describe, expect, it } from "vitest"
import { applyActualCost, resolveCostToConsumeUsdtMilli } from "./cost-to-consume"
import { money } from "../../shared/money"
import { product } from "@/catalogue"
import { player, order } from "@/ordering"
import { client } from "@/accounts"
import { cogsEgpMinor } from "@/treasury"

function makeOrder() {
  return order({
    id: "o1",
    token: "t1",
    profileId: "p1",
    client: client("c1"),
    product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
    player: player("1", "2"),
    price: money(12000, "USD"),
    costMinor: 73,
    wacEgpMinor: 50,
    cogsEgpMinor: cogsEgpMinor(730, 50),
    tradingMarginMinor: 11927,
    markupBasisPoints: 2000,
  })
}

describe("resolveCostToConsumeUsdtMilli", () => {
  it("accepts distributor price within tolerance (50 milli or 10%)", () => {
    expect(resolveCostToConsumeUsdtMilli(750, 730)).toBe(750)
  })

  it("rejects distributor price outside tolerance and falls back to catalogue", () => {
    expect(resolveCostToConsumeUsdtMilli(1640, 1370)).toBe(1370)
  })

  it("keeps cent-aligned values working", () => {
    expect(resolveCostToConsumeUsdtMilli(730, 730)).toBe(730)
  })

  it("accepts 165 milli (0.165 USD) when catalogue is 170 milli-equivalent context is within tolerance", () => {
    expect(resolveCostToConsumeUsdtMilli(165, 170)).toBe(165)
  })
})

describe("applyActualCost", () => {
  it("stores the exact ledger basis as cogsEgpMinor", () => {
    const o = makeOrder()
    const next = applyActualCost(o, 720, 3600)
    expect(next).not.toBe(o)
    expect(next.costMinor).toBe(72)
    expect(next.costUsdtMilli).toBe(720)
    expect(next.cogsEgpMinor).toBe(3600)
    expect(next.tradingMarginMinor).toBe(11928)
  })

  it("uses the exact ledger basis even when it differs from recomputed cogs (7441 vs 7440)", () => {
    const o = makeOrder()
    const basisEgpMinor = 7441
    expect(basisEgpMinor).not.toBe(cogsEgpMinor(1488, 50))
    const next = applyActualCost(o, 1488, basisEgpMinor)
    expect(next).not.toBe(o)
    expect(next.costMinor).toBe(149)
    expect(next.costUsdtMilli).toBe(1488)
    expect(next.cogsEgpMinor).toBe(7441)
  })

  it("uses 165 milli (0.165 USD) giving derived costMinor 17 and exact ledger basis", () => {
    const o = makeOrder()
    const next = applyActualCost(o, 165, 8)
    expect(next).not.toBe(o)
    expect(next.costMinor).toBe(17)
    expect(next.costUsdtMilli).toBe(165)
    expect(next.cogsEgpMinor).toBe(8)
  })

  it("returns the same object when derived cost and cogs match", () => {
    const o = makeOrder()
    const currentBasis = cogsEgpMinor(730, 50)
    const next = applyActualCost(o, 730, currentBasis)
    // will set costUsdtMilli; calling again should be no-op
    const next2 = applyActualCost(next, 730, currentBasis)
    expect(next2).toBe(next)
  })

  it("returns the same object when margin < 0", () => {
    const o = makeOrder()
    const next = applyActualCost(o, 130000, 650000)
    expect(next).toBe(o)
  })
})
