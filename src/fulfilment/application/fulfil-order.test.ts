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

describe("createFulfilOrder", () => {
  it("calls the distributor with the order id, game, product and player", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PENDING" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(distributor.placeOrder).toHaveBeenCalledWith({ orderId: paid.id, game: paid.product.game, product: paid.product, player: paid.player })
  })

  it("a COMPLETED distributor response yields status DELIVERED and one update call", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(paid)
    expect(res.status).toBe("DELIVERED")
    expect(orders.update).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledTimes(1)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: paid.costMinor! * 10 })
  })

  it("reprices persisted order using exact ledger basis when distributor actual debit differs", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 72 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 720, basisEgpMinor: 3600, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 720 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(72)
    expect(updated.costUsdtMilli).toBe(720)
    expect(updated.cogsEgpMinor).toBe(3600)
    expect(updated.tradingMarginMinor).toBe(11928)
  })

  it("persists exact ledger basis even when it differs from cogsEgpMinor(costUsdtMilli, wacEgpMinor) (7441 vs 7440)", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 149 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 1488 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 1488, basisEgpMinor: 7441, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 1488 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(149)
    expect(updated.cogsEgpMinor).toBe(7441)
  })

  it("consumes 165 milli (0.165 USD) not 170 and derives costMinor 17 with exact ledger basis", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 17 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 165 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const wac = 50
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 165, basisEgpMinor: 8, wacEgpMinor: wac, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 165 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(17)
    expect(updated.costUsdtMilli).toBe(165)
    expect(updated.cogsEgpMinor).toBe(8)
  })

  it("uses distributor priceUsdtMilli 1367 when catalogue costMinor is 136 (1360 milli) -> consumes 1367, stores costUsdtMilli 1367, costMinor 137, COGS uses exact consumption basis", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 136 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 1367 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 1367, basisEgpMinor: 5000, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 1367 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costUsdtMilli).toBe(1367)
    expect(updated.costMinor).toBe(137)
    expect(updated.cogsEgpMinor).toBe(5000)
  })

  it("falls back to usdtMilliFromUsdMinor(priceMinor) when priceUsdtMilli undefined and stores that value", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 73 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 73 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 730 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costUsdtMilli).toBe(730)
    expect(updated.costMinor).toBe(73)
    expect(updated.cogsEgpMinor).toBe(3650)
  })

  it("COMPLETED but consumption fails leaves the order retryable", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockRejectedValue(new RangeError("Insufficient treasury")) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await expect(fulfil(paid)).rejects.toThrow("Insufficient treasury")
    expect(orders.update).not.toHaveBeenCalled()
  })

  it("COMPLETED consumes before persisting DELIVERED", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder.mock.invocationCallOrder[0]).toBeLessThan((orders.update as any).mock.invocationCallOrder[0])
  })

  it("Distributor price within the 10%/5-minor band -> consumeForOrder called with the distributor price", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 75 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 750 })
  })

  it("Distributor price outside the band (e.g. 164 when catalogue cost is 137) -> consumeForOrder called with order.costMinor", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 137 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: 164 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 1370 })
  })

  it("priceMinor undefined -> consumeForOrder called with order.costMinor (unchanged behaviour)", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceMinor: undefined }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: paid.costMinor! * 10 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costUsdtMilli).toBe(paid.costMinor! * 10)
  })

  it("uses exact distributor priceUsdtMilli inside tolerance when catalogue cost differs (1360 -> 1367)", async () => {
    const base = makePaidOrder()
    const paid = { ...base, costMinor: 136 }
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED", priceUsdtMilli: 1367 }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 1367, basisEgpMinor: 6835, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await fulfil(paid)
    expect(treasury.consumeForOrder).toHaveBeenCalledWith({ orderId: paid.id, costUsdtMilli: 1367 })
    const updated = (orders.update as any).mock.calls[0][0]
    expect(updated.costMinor).toBe(137)
    expect(updated.costUsdtMilli).toBe(1367)
    expect(updated.cogsEgpMinor).toBe(6835)
  })

  it("a FAILED response yields status FAILED", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "FAILED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(paid)
    expect(res.status).toBe("FAILED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a PENDING response leaves FULFILLING with the distributor order id attached", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "PENDING" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
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
      profileId: "p1",
      client: client("c1"),
      product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
      player: player("1", "2"),
      price: money(12000, "USD"),
      markupBasisPoints: 2000,
    })
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn(),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await expect(fulfil(o)).rejects.toBeInstanceOf(FulfilmentError)
    expect(distributor.placeOrder).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a COMPLETED order with costMinor null never consumes", async () => {
    const paid = makePaidOrder()
    const o = apply(apply(order({ id: paid.id, token: paid.token, profileId: paid.profileId, client: paid.client, product: paid.product, player: paid.player, price: paid.price, costMinor: null, wacEgpMinor: paid.wacEgpMinor, cogsEgpMinor: paid.cogsEgpMinor ,
    markupBasisPoints: 0,
  }), "REQUEST_PAYMENT"), "PAYMENT_CONFIRMED")
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockResolvedValue({ distributorOrderId: "D1", status: "COMPLETED" }),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    const res = await fulfil(o)
    expect(res.status).toBe("DELIVERED")
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })

  it("a rejecting placeOrder propagates and update is never called", async () => {
    const paid = makePaidOrder()
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), countByClient: vi.fn().mockResolvedValue(0), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({rows:[], total:0}), sumCoinsChargedSince: vi.fn().mockResolvedValue(0), summarizeByClient: vi.fn().mockResolvedValue({ totalOrders: 0, totalPaidCoins: 0, monthlyPaidCoins: 0 }), listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const distributor: Distributor = {
      checkPlayer: vi.fn(),
      placeOrder: vi.fn().mockRejectedValue(new Error("boom")),
      getOrder: vi.fn(),
      getBalance: vi.fn(),
    }
    const treasury = { consumeForOrder: vi.fn().mockResolvedValue({ id: "c1", orderId: "o1", usdtMilli: 730, basisEgpMinor: 3650, wacEgpMinor: 50, createdAt: "2026-11-10T00:00:00.000Z" }) }
    const refund = vi.fn(async (value: any) => value)
    const fulfil = createFulfilOrder({ orders, distributor, treasury, refund })
    await expect(fulfil(paid)).rejects.toThrow("boom")
    expect(orders.update).not.toHaveBeenCalled()
    expect(treasury.consumeForOrder).not.toHaveBeenCalled()
  })
})
