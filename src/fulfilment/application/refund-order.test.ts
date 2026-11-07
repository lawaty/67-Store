import { describe, expect, it, vi } from "vitest"
import { createRefundOrder } from "./refund-order"
import { order } from "@/ordering"
import { money } from "../../shared/money"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { client } from "@/accounts"
import { OrderRepository } from "@/ordering"
import { WalletRepository } from "@/wallet"

function makeFailedOrder(coinsCharged: number | null = 100) {
  return order({
    id: "o1",
    token: "t1",
    client: client("c1"),
    product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
    player: player("1", "2"),
    price: money(12000, "USD"),
    status: "FAILED",
    coinsCharged,
    markupBasisPoints: 2000,
  })
}

describe("createRefundOrder", () => {
  it("credits once and returns REFUNDED with refundedAt", async () => {
    const o = makeFailedOrder(100)
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({ rows: [], total: 0 }), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const wallets: WalletRepository = { getOrCreate: vi.fn(), credit: vi.fn().mockResolvedValue({ clientId: "c1", coinBalance: 100 }), debit: vi.fn(), listEntries: vi.fn() }
    const now = vi.fn(() => "2026-01-01T00:00:00.000Z")
    const refund = createRefundOrder({ orders, wallets, now })
    const res = await refund(o)
    expect(wallets.credit).toHaveBeenCalledWith("c1", 100, "refund:o1")
    expect(res.status).toBe("REFUNDED")
    expect(res.refundedAt).toBe("2026-01-01T00:00:00.000Z")
    expect(orders.update).toHaveBeenCalledTimes(1)
  })

  it("a second call does not credit again", async () => {
    const o = makeFailedOrder(100)
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({ rows: [], total: 0 }), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const wallets: WalletRepository = { getOrCreate: vi.fn(), credit: vi.fn().mockResolvedValue({ clientId: "c1", coinBalance: 100 }), debit: vi.fn(), listEntries: vi.fn() }
    const now = vi.fn(() => "2026-01-01T00:00:00.000Z")
    const refund = createRefundOrder({ orders, wallets, now })
    const first = await refund(o)
    const creditCalls = (wallets.credit as any).mock.calls.length
    const second = await refund(first)
    expect((wallets.credit as any).mock.calls.length).toBe(creditCalls)
    expect(second).toBe(first)
  })

  it("coinsCharged null does nothing", async () => {
    const o = makeFailedOrder(null)
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({ rows: [], total: 0 }), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const wallets: WalletRepository = { getOrCreate: vi.fn(), credit: vi.fn(), debit: vi.fn(), listEntries: vi.fn() }
    const now = vi.fn(() => "2026-01-01T00:00:00.000Z")
    const refund = createRefundOrder({ orders, wallets, now })
    const res = await refund(o)
    expect(wallets.credit).not.toHaveBeenCalled()
    expect(orders.update).not.toHaveBeenCalled()
    expect(res).toBe(o)
  })

  it("non-FAILED does nothing", async () => {
    const o = order({
      id: "o1",
      token: "t1",
      client: client("c1"),
      product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
      player: player("1", "2"),
      price: money(12000, "USD"),
      status: "PAID",
      coinsCharged: 100,
      markupBasisPoints: 2000,
    })
    const orders: OrderRepository = { save: vi.fn(), findById: vi.fn(), findByToken: vi.fn(), update: vi.fn(), listRecent: vi.fn().mockResolvedValue([]), listByClient: vi.fn().mockResolvedValue([]), findByDistributorOrderId: vi.fn().mockResolvedValue(null), listByStatus: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue({ rows: [], total: 0 }), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) }
    const wallets: WalletRepository = { getOrCreate: vi.fn(), credit: vi.fn(), debit: vi.fn(), listEntries: vi.fn() }
    const now = vi.fn(() => "2026-01-01T00:00:00.000Z")
    const refund = createRefundOrder({ orders, wallets, now })
    const res = await refund(o)
    expect(wallets.credit).not.toHaveBeenCalled()
    expect(orders.update).not.toHaveBeenCalled()
    expect(res).toBe(o)
  })
})