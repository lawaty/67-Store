import { describe, expect, it, vi } from "vitest"
import { createSyncFulfilment } from "./sync-fulfilment"
import { FulfilmentError } from "../domain/fulfilment-error"
import { order, apply, attachDistributorOrder } from "@/ordering"
import { money } from "../../shared/money"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { client } from "@/accounts"
import { Distributor } from "../ports/distributor"
import { OrderRepository } from "@/ordering"

function makePaidOrder() {
  const o = order({
    id: "o1",
    token: "t1",
    profileId: "p1",
    client: client("c1"),
    product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
    player: player("1", "2"),
    price: money(12000, "USD"),
    costMinor: 73,
    wacEgpMinor: 50,
    cogsEgpMinor: 100,
    markupBasisPoints: 2000,
  })
  const o2 = apply(o, "REQUEST_PAYMENT")
  const o3 = apply(o2, "PAYMENT_CONFIRMED")
  return o3
}

function makeFulfillingOrder() {
  const paid = makePaidOrder()
  let o = apply(paid, "FULFILMENT_STARTED")
  o = attachDistributorOrder(o, "D1")
  return o
}

describe("createSyncFulfilment", () => {
  it("a DELIVERED order is returned unchanged and the distributor is not called", async () => {
    const paid = makePaidOrder()
    let o = apply(paid, "FULFILMENT_STARTED")
    o = attachDistributorOrder(o, "D1")
    o = apply(o, "DELIVERY_SUCCEEDED")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn(), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res).toBe(o)
    expect(distributor.getOrder).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("COMPLETED on a FULFILLING order yields DELIVERED and one update", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("DELIVERED")
    expect(orders.update).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: o.costMinor! * 10 })
  })

  it("COMPLETED but consumption fails leaves the order retryable", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockRejectedValue(new RangeError("Insufficient treasury")) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await expect(sync(o)).rejects.toThrow("Insufficient treasury")
    expect(orders.update).not.toHaveBeenCalled()
  })

  it("COMPLETED consumes before persisting DELIVERED", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder.mock.invocationCallOrder[0]).toBeLessThan((orders.update as any).mock.invocationCallOrder[0])
  })

  it("reprices persisted order using exact ledger basis when distributor actual debit differs", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 72 }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 720, basisEgpMinor: 3600, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: 720 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(72)
    expect(updated.costUsdtMilli).toBe(720)
    expect(updated.cogsEgpMinor).toBe(3600)
    expect(updated.tradingMarginMinor).toBe(11928)
  })

  it("persists exact ledger basis even when it differs from cogsEgpMinor(costUsdtMilli, wacEgpMinor) (7441 vs 7440)", async () => {
    const base = makeFulfillingOrder()
    const o = { ...base, costMinor: 149 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 1488 }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 1488, basisEgpMinor: 7441, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: 1488 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(149)
    expect(updated.cogsEgpMinor).toBe(7441)
  })

  it("consumes 165 milli (0.165 USD distributor price) not 170 and derives costMinor 17 with exact ledger basis", async () => {
    const base = makeFulfillingOrder()
    const o = { ...base, costMinor: 17 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 165 }), getBalance: vi.fn() }
    const wac = 50
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 165, basisEgpMinor: 8, wacEgpMinor: wac, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: 165 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(17)
    expect(updated.costUsdtMilli).toBe(165)
    expect(updated.cogsEgpMinor).toBe(8)
  })

  it("Distributor price within the 10%/5-minor band -> consumeForOrder called with the distributor price", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 75 }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: 750 })
  })

  it("Distributor price outside the band (e.g. 164 when catalogue cost is 137) -> consumeForOrder called with order.costMinor", async () => {
    const base = makeFulfillingOrder()
    const o = { ...base, costMinor: 137 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 164 }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: 1370 })
  })

  it("priceMinor undefined -> consumeForOrder called with order.costMinor (unchanged behaviour)", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: undefined }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await sync(o)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMilli: o.costMinor! * 10 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costUsdtMilli).toBe(o.costMinor! * 10)
    expect(updated.costMinor).toBe(Math.round((o.costMinor! * 10) / 10))
    expect(updated.cogsEgpMinor).toBe(3650)
  })

  it("FAILED yields FAILED", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "FAILED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("FAILED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("PROCESSING returns the same order and does not update", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PROCESSING" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res).toBe(o)
    expect(orders.update).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a COMPLETED order with costMinor null never consumes", async () => {
    const paid = makePaidOrder()
    const o0 = order({ id: paid.id, token: paid.token, profileId: paid.profileId, client: paid.client, product: paid.product, player: paid.player, price: paid.price, costMinor: null, wacEgpMinor: paid.wacEgpMinor, cogsEgpMinor: paid.cogsEgpMinor ,
    markupBasisPoints: 0,
  })
    const o1 = apply(o0, "REQUEST_PAYMENT")
    const o2 = apply(o1, "PAYMENT_CONFIRMED")
    let o = apply(o2, "FULFILMENT_STARTED")
    o = attachDistributorOrder(o, "D1")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("DELIVERED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a FULFILLING order without a distributor order id throws FulfilmentError", async () => {
    const paid = makePaidOrder()
    const o = apply(paid, "FULFILMENT_STARTED")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn(), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await expect(sync(o)).rejects.toBeInstanceOf(FulfilmentError)
  })
})
