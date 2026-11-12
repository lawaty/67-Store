import { describe, expect, it, vi } from "vitest"
import { createRetryFailedRefunds } from "./retry-failed-refunds"
import type { Order } from "@/ordering"

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    token: "t1",
    client: { id: "c1" },
    product: {},
    player: { userId: "1", serverId: "2" },
    price: { minor: 12000, currency: "USD" },
    status: "FAILED",
    paymentReference: null,
    distributorOrderId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    discountMinor: null,
    costMinor: null,
    costUsdtMilli: null,
    promoCodeId: null,
    playerName: null,
    wacEgpMinor: null,
    cogsEgpMinor: null,
    tradingMarginMinor: null,
    coinsCharged: 100,
    coinValueMinor: null,
    coinsConsumed: null,
    markupBasisPoints: null,
    refundedAt: null,
    ...overrides,
  } as unknown as Order
}

describe("createRetryFailedRefunds", () => {
  it("empty list returns { checked: 0, refunded: 0, failed: 0 }", async () => {
    const orders = { listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([]) }
    const refund = vi.fn()
    const retry = createRetryFailedRefunds({ orders, refund })
    await expect(retry()).resolves.toEqual({ checked: 0, refunded: 0, failed: 0 })
  })

  it("a FAILED unrefunded order that refunds to REFUNDED counts as refunded", async () => {
    const o = fakeOrder()
    const orders = { listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([o]) }
    const refundedOrder = fakeOrder({ status: "REFUNDED", refundedAt: "2026-01-01T00:00:00.000Z" })
    const refund = vi.fn().mockResolvedValue(refundedOrder)
    const retry = createRetryFailedRefunds({ orders, refund })
    await expect(retry()).resolves.toEqual({ checked: 1, refunded: 1, failed: 0 })
    expect(refund).toHaveBeenCalledWith(o)
  })

  it("an order whose refund returns unchanged (not REFUNDED, refundedAt null) is checked but not counted as refunded", async () => {
    const o = fakeOrder()
    const orders = { listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([o]) }
    const refund = vi.fn().mockResolvedValue(fakeOrder({ status: "FAILED", refundedAt: null }))
    const retry = createRetryFailedRefunds({ orders, refund })
    await expect(retry()).resolves.toEqual({ checked: 1, refunded: 0, failed: 0 })
  })

  it("one refund throw increments failed and the next order is still processed", async () => {
    const o1 = fakeOrder({ id: "o1" })
    const o2 = fakeOrder({ id: "o2" })
    const orders = { listFailedUnrefundedCoinOrders: vi.fn().mockResolvedValue([o1, o2]) }
    const refund = vi.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(fakeOrder({ id: "o2", status: "REFUNDED", refundedAt: "2026-01-01T00:00:00.000Z" }))
    const retry = createRetryFailedRefunds({ orders, refund })
    await expect(retry()).resolves.toEqual({ checked: 2, refunded: 1, failed: 1 })
    expect(refund).toHaveBeenCalledTimes(2)
  })
})
