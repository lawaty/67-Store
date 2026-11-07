import { describe, expect, test } from "vitest"
import { money } from "../../shared/money"
import { client } from "@/accounts"
import { product } from "@/catalogue"
import { player } from "../domain/player"
import { markup } from "../domain/pricing"
import { Order } from "../domain/order"
import { OrderRepository } from "../ports/order-repository"
import { createPlaceOrder } from "./place-order"
import { PromoRepository } from "@/promos"
import { PromoCode } from "@/promos"

class InMemoryOrderRepository implements OrderRepository {
  saved: Order[] = []
  async save(order: Order): Promise<void> {
    this.saved.push(order)
  }
  async findById(id: string): Promise<Order | null> {
    for (const o of this.saved) {
      if (o.id === id) return o
    }
    return null
  }
  async findByToken(token: string): Promise<Order | null> {
    for (const o of this.saved) {
      if (o.token === token) return o
    }
    return null
  }
  async update(order: Order): Promise<void> {
    for (let i = 0; i < this.saved.length; i++) {
      if (this.saved[i].id === order.id) {
        this.saved[i] = order
        return
      }
    }
    this.saved.push(order)
  }
  async listRecent(): Promise<Order[]> {
    return []
  }
  async listByClient(): Promise<Order[]> {
    return []
  }
  async findByDistributorOrderId(): Promise<Order | null> {
    return null
  }
  async listByStatus(): Promise<Order[]> {
    return []
  }
  async search(): Promise<{ rows: Order[]; total: number }> {
    return { rows: [], total: 0 }
  }
  async sumCoinsChargedSince(): Promise<number> {
    return 0
  }
}


class InMemoryPromoRepository implements PromoRepository {
  promos: PromoCode[] = []
  async create(input: any): Promise<void> { this.promos.push({ id: input.id, code: input.code.toUpperCase(), kind: input.kind, basisPoints: input.basisPoints, amountMinor: input.amountMinor, maxUses: input.maxUses, uses: 0, active: true, expiresAt: input.expiresAt }) }
  async listAll(): Promise<PromoCode[]> { return this.promos.map((p) => ({ ...p })) }
  async setActive(id: string, active: boolean): Promise<void> { const p = this.promos.find((x) => x.id === id); if (p) (p as any).active = active }
  async redeem(input: { code: string; orderId: string; clientId: string | null; now: string }): Promise<any> {
    const code = input.code.trim().replace(/\s+/g, " ").toUpperCase()
    const p = this.promos.find((x) => x.code === code)
    if (!p) return { ok: false, reason: "unknown" }
    if (!p.active) return { ok: false, reason: "inactive" }
    if (p.expiresAt !== null && p.expiresAt <= input.now) return { ok: false, reason: "expired" }
    if (p.maxUses !== null && p.uses >= p.maxUses) { return { ok: false, reason: "exhausted" } }
    (p as any).uses += 1
    return { ok: true, promo: { ...p } }
  }
}

describe("place-order", () => {
  test("saves exactly one order and returns it", async () => {
    const repo = new InMemoryOrderRepository()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o1", newToken: () => "tok1", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const result = (await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).order
    expect(repo.saved.length).toBe(1)
    expect(result).toBe(repo.saved[0])
  })

  test("the saved order has status CREATED, the injected id and token, and the quoted price", async () => {
    const repo = new InMemoryOrderRepository()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o2", newToken: () => "tok2", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const result = (await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).order
    expect(result.status).toBe("CREATED")
    expect(result.id).toBe("o2")
    expect(result.token).toBe("tok2")
    expect(result.price.minor).toBe(12000)
    expect(result.price.currency).toBe("USD")
    expect(result.coinValueMinor).toBe(100)
  })



  test("client, product and player are carried through by reference", async () => {
    const repo = new InMemoryOrderRepository()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o5", newToken: () => "tok5", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const result = (await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).order
    expect(result.client).toBe(c)
    expect(result.product).toBe(p)
    expect(result.player).toBe(pl)
  })

  test("newId and newToken are each called once per call", async () => {
    const repo = new InMemoryOrderRepository()
    let idCalls = 0
    let tokenCalls = 0
    const placeOrder = createPlaceOrder({
      orders: repo,
      newId: () => {
        idCalls++
        return "o6"
      },
      newToken: () => {
        tokenCalls++
        return "tok6"
      },
      promos: new InMemoryPromoRepository(),
      now: () => "2026-01-01T00:00:00.000Z",
      wac: async () => 0,
    })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })
    expect(idCalls).toBe(1)
    expect(tokenCalls).toBe(1)
  })

  test("the order is persisted before it is returned (assert the fake recorded the same object that was returned)", async () => {
    const repo = new InMemoryOrderRepository()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o7", newToken: () => "tok7", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const result = (await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).order
    expect(repo.saved[0]).toBe(result)
  })

  test("a failing save rejects and the order is not returned", async () => {
    const repo = new InMemoryOrderRepository()
    repo.save = async () => {
      throw new Error("fail")
    }
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o8", newToken: () => "tok8", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    await expect(placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).rejects.toThrow("fail")
    expect(repo.saved.length).toBe(0)
  })
})

describe("place-order promo codes", () => {
  function makeRepo() {
    return new InMemoryPromoRepository()
  }

  test("percent discount applied after markup", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo1", code: "P10", kind: "PERCENT", basisPoints: 1000, amountMinor: null, maxUses: null, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "P10" })
    expect(res.promoError).toBeNull()
    expect(res.order.price.minor).toBe(10800)
    expect(res.order.discountMinor).toBe(1200)
    expect(res.order.promoCodeId).toBe("promo1")
    expect(res.order.costMinor).toBe(10000)
  })

  test("fixed discount", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo2", code: "F5", kind: "FIXED", basisPoints: null, amountMinor: 500, maxUses: null, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "F5" })
    expect(res.promoError).toBeNull()
    expect(res.order.price.minor).toBe(11500)
    expect(res.order.discountMinor).toBe(500)
  })

  test("clamp at distributor cost", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo3", code: "BIG", kind: "PERCENT", basisPoints: 9000, amountMinor: null, maxUses: null, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "BIG" })
    expect(res.promoError).toBeNull()
    expect(res.order.price.minor).toBe(10000)
    expect(res.order.discountMinor).toBe(2000)
  })

  test("code consumed on creation", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo4", code: "USE", kind: "FIXED", basisPoints: null, amountMinor: 100, maxUses: 5, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "USE" })
    expect(promos.promos[0].uses).toBe(1)
  })

  test("invalid code returns unknown", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "NOPE" })
    expect(res.promoError).toBe("unknown")
    expect(res.order.price.minor).toBe(12000)
  })

  test("expired code returns expired", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo5", code: "EXP", kind: "FIXED", basisPoints: null, amountMinor: 100, maxUses: null, expiresAt: "2025-01-01T00:00:00.000Z" })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "EXP" })
    expect(res.promoError).toBe("expired")
  })

  test("exhausted code returns exhausted", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    await promos.create({ id: "promo6", code: "EXH", kind: "FIXED", basisPoints: null, amountMinor: 100, maxUses: 0, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "EXH" })
    expect(res.promoError).toBe("exhausted")
  })

  test("null code leaves price untouched", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = makeRepo()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })
    expect(res.promoError).toBeNull()
    expect(res.order.price.minor).toBe(12000)
  })
})

describe("place-order snapshot", () => {
  test("snapshots WAC, COGS and trading margin", async () => {
    const repo = new InMemoryOrderRepository()
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos: new InMemoryPromoRepository(), now: () => "2026-01-01T00:00:00.000Z", wac: async () => 5000 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const result = (await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: null })).order
    expect(result.wacEgpMinor).toBe(5000)
    expect(result.cogsEgpMinor).toBe(Math.floor((100 * 5000 + 50) / 100))
    expect(result.tradingMarginMinor).toBe(result.price.minor - 100)
  })

  test("a promo-discounted order stores the discounted margin and it is >= 0", async () => {
    const repo = new InMemoryOrderRepository()
    const promos = new InMemoryPromoRepository()
    await promos.create({ id: "promo1", code: "BIG", kind: "PERCENT", basisPoints: 9000, amountMinor: null, maxUses: null, expiresAt: null })
    const placeOrder = createPlaceOrder({ orders: repo, newId: () => "o", newToken: () => "t", promos, now: () => "2026-01-01T00:00:00.000Z", wac: async () => 0 })
    const c = client("c1")
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const res = await placeOrder({ client: c, product: p, player: pl, markup: markup(2000), coinValueMinor: 100, promoCode: "BIG" })
    expect(res.order.tradingMarginMinor).toBeGreaterThanOrEqual(0)
    expect(res.order.tradingMarginMinor).toBe(res.order.price.minor - 10000)
  })
})