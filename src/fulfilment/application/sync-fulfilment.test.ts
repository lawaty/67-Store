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
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn(), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res).toBe(o)
    expect(distributor.getOrder).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("COMPLETED on a FULFILLING order yields DELIVERED and one update", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("DELIVERED")
    expect(orders.update).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: o.id, costUsdtMinor: o.costMinor, wacEgpMinor: o.wacEgpMinor ?? 0, cogsEgpMinor: o.cogsEgpMinor ?? 0 })
  })

  it("FAILED yields FAILED", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "FAILED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("FAILED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("PROCESSING returns the same order and does not update", async () => {
    const o = makeFulfillingOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PROCESSING" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res).toBe(o)
    expect(orders.update).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a COMPLETED order with costMinor null never consumes", async () => {
    const paid = makePaidOrder()
    const o0 = order({ id: paid.id, token: paid.token, client: paid.client, product: paid.product, player: paid.player, price: paid.price, costMinor: null, wacEgpMinor: paid.wacEgpMinor, cogsEgpMinor: paid.cogsEgpMinor ,
    markupBasisPoints: 0,
  })
    const o1 = apply(o0, "REQUEST_PAYMENT")
    const o2 = apply(o1, "PAYMENT_CONFIRMED")
    let o = apply(o2, "FULFILMENT_STARTED")
    o = attachDistributorOrder(o, "D1")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    const res = await sync(o)
    expect(res.status).toBe("DELIVERED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a FULFILLING order without a distributor order id throws FulfilmentError", async () => {
    const paid = makePaidOrder()
    const o = apply(paid, "FULFILMENT_STARTED")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = { checkPlayer: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn(), getBalance: vi.fn() }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const sync = createSyncFulfilment({ orders, distributor, treasury, refund })
    await expect(sync(o)).rejects.toBeInstanceOf(FulfilmentError)
  })
})
