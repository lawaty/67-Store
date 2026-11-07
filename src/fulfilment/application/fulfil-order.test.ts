import { describe, expect, it, vi } from "vitest"
import { createFulfilOrder } from "./fulfil-order"
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

describe("createFulfilOrder", () => {
  it("calls the distributor with the order id, game, product and player", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PENDING" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(distributor.placeOrder).toHaveBeenCalledWith({ orderId: paid.id, game: paid.product.game, product: paid.product, player: paid.player })
  })

  it("a COMPLETED distributor response yields status DELIVERED and one update call", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(paid)
    expect(res.status).toBe("DELIVERED")
    expect(orders.update).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMinor: paid.costMinor, wacEgpMinor: paid.wacEgpMinor ?? 0, cogsEgpMinor: paid.cogsEgpMinor ?? 0 })
  })

  it("a FAILED response yields status FAILED", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "FAILED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(paid)
    expect(res.status).toBe("FAILED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a PENDING response leaves FULFILLING with the distributor order id attached", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PENDING" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(paid)
    expect(res.status).toBe("FULFILLING")
    expect(res.distributorOrderId).toBe("D1")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("throws FulfilmentError when the order is not PAID (use a CREATED order) and never calls the distributor", async () => {
    const o = order({
      id: "o1",
      token: "t1",
      client: client("c1"),
      product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
      player: player("1", "2"),
      price: money(12000, "USD"),
      markupBasisPoints: 2000,
    })
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn(),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await expect(fulfil(o)).rejects.toBeInstanceOf(FulfilmentError)
    expect(distributor.placeOrder).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a COMPLETED order with costMinor null never consumes", async () => {
    const paid = makePaidOrder()
    const o = apply(apply(order({ id: paid.id, token: paid.token, client: paid.client, product: paid.product, player: paid.player, price: paid.price, costMinor: null, wacEgpMinor: paid.wacEgpMinor, cogsEgpMinor: paid.cogsEgpMinor ,
    markupBasisPoints: 0,
  }), "REQUEST_PAYMENT"), "PAYMENT_CONFIRMED")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(o)
    expect(res.status).toBe("DELIVERED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a rejecting placeOrder propagates and update is never called", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockRejectedValue(new Error("boom")),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn() }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await expect(fulfil(paid)).rejects.toThrow("boom")
    expect(orders.update).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })
})
