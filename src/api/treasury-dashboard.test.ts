import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { readTreasuryDashboard } from "./admin"
import { deposit } from "@/treasury"
import { funding } from "@/treasury"
import { treasuryConsumption } from "@/treasury"

function fakeContainer(overrides: Partial<Container> = {}): Container {
  const now = new Date().toISOString()
  return {

    promos: { create: async () => {}, listAll: async () => [], setActive: async () => {}, redeem: async () => ({ ok: false as const, reason: "unknown" as const }) },
    settings: { get: async () => null, set: async () => {}, delete: async () => {}, all: async () => ({}) },
    wallets: { credit: async () => ({ clientId: "c1", coinBalance: 0 }), debit: async () => true, getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }), listEntries: async () => [] },
    accounts: { list: async () => ({ rows: [], total: 0 }), findById: async () => null, findByEmail: async () => null, create: async () => ({ id: "", clientId: "", email: "", username: "", passwordHash: "" }), listPreferences: async () => ({}), setPreference: async () => {} },
    clients: { findById: async () => null, save: async () => {} },
    orders: { listRecent: async () => [], search: async () => ({ rows: [], total: 0 }), save: async () => {}, findById: async () => null, findByToken: async () => null, update: async () => {}, listByClient: async () => [], findByDistributorOrderId: async () => null, listByStatus: async () => [] },
    distributor: { getBalance: async () => ({ balanceMilli: 10000 }), checkPlayer: async () => ({ valid: true, name: "P" }), placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }), getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }) },
    products: { listActive: async () => [], listAll: async () => [], upsertMany: async () => {}, deactivateExcept: async () => 0 },
    treasury: {
      snapshot: async () => ({ usdtMilli: 10000, basisEgpMinor: 50000, wacEgpMinor: 5000 }),
      recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMilli: 0, createdAt: now }),
      consumeForOrder: async () => ({ id: "c", orderId: "o", usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0, createdAt: now }),
      reconcile: async () => ({ id: "r", expectedUsdtMilli: 0, supplierUsdtMilli: 0, gapUsdtMilli: 0, status: "OK", createdAt: now }),
    } as any,
    syncCatalogue: async () => ({ synced: 0, deactivated: 0 }),
    checkPrice: async () => ({ ok: true } as any),
    placeOrder: async () => ({} as any),
    startPayment: async () => ({} as any),
    confirmPayment: async () => ({} as any),
    fulfilOrder: async () => ({} as any),
    syncFulfilment: async () => ({} as any),

    recordDeposit: async () => ({ ok: true } as any),
    coinSupply: { totalCoins: async () => 0 },
    fundings: {
      append: async () => {},
      totals: async () => ({ usdtMilli: 0, basisEgpMinor: 0 }),
      listRecent: async () => [],
      findById: async () => null,
      remove: async () => false,
    },
    consumptions: {
      append: async () => {},
      totals: async () => ({ usdtMilli: 0, basisEgpMinor: 0 }),
      findByOrder: async () => null,
      sumUsdtSince: async () => 0,
      listRecent: async () => [],
    },
    reconciliations: { append: async () => {}, latest: async () => null },
    deposits: { append: async () => {}, list: async () => [], listByClient: async () => [], listRecent: async () => [], listSince: async () => [], coinWacEgpMinor: async () => 0 },
    orderReport: { summarySince: async () => ({ deliveredCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0 }), dailySeriesSince: async () => [], wacSeriesSince: async () => [] },
    alerts: { append: async () => ({ id: "a", kind: "k", message: "m", createdAt: now }), listRecent: async () => [] },
    p2pRate: { read: async () => null },
    ...overrides,
  } as unknown as Container
}

describe("readTreasuryDashboard", () => {
  it("successful balance, WAC and coverage", async () => {
    const d = await readTreasuryDashboard(fakeContainer())
    expect(d.balance).toEqual({ usdMilli: 10000, egpMinor: 48500 })
    expect(d.balanceError).toBe(false)
    expect(d.balanceAt).not.toBeNull()
    expect(d.p2pEgpPerUsdtMinor).toBeNull()
    expect(d.recordedUsdtMilli).toBe(10000)
    expect(d.recordedBasisEgpMinor).toBe(50000)
    expect(d.wacEgpMinor).toBe(5000)
    expect(d.freeUsdtMilli).toBe(0)
    expect(d.availableUsdtMilli).toBe(10000)
  })

  it("balance failure sets balanceError and balance null", async () => {
    const container = fakeContainer({
      distributor: { getBalance: async () => { throw new Error("offline") }, checkPlayer: async () => ({ valid: true, name: "P" }), placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }), getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }) },
    })
    const d = await readTreasuryDashboard(container)
    expect(d.balance).toBeNull()
    expect(d.balanceError).toBe(true)
    expect(d.balanceAt).toBeNull()
    expect(d.p2pEgpPerUsdtMinor).toBeNull()
    expect(d.freeUsdtMilli).toBe(0)
    expect(d.availableUsdtMilli).toBe(10000)
  })

  it("computes free and available USDT from live balance, with P2P rate", async () => {
    const container = fakeContainer({
      distributor: { getBalance: async () => ({ balanceMilli: 20000 }), checkPlayer: async () => ({ valid: true, name: "P" }), placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }), getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }) },
      p2pRate: { read: async () => ({ egpPerUsdtMinor: 5100, fetchedAt: "2026-01-01T00:00:00.000Z", source: "binance-p2p" as const, stale: false }) },
      treasury: {
        snapshot: async () => ({ usdtMilli: 10000, basisEgpMinor: 50000, wacEgpMinor: 5000 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMilli: 0, createdAt: "now" }),
        consumeForOrder: async () => ({ id: "c", orderId: "o", usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0, createdAt: "now" }),
        reconcile: async () => ({ id: "r", expectedUsdtMilli: 0, supplierUsdtMilli: 0, gapUsdtMilli: 0, status: "OK", createdAt: "now" }),
      } as any,
    })
    const d = await readTreasuryDashboard(container)
    expect(d.p2pEgpPerUsdtMinor).toBe(5100)
    expect(d.p2pMaxEgpPerUsdtMinor).toBeNull()
    expect(d.recordedUsdtMilli).toBe(10000)
    expect(d.freeUsdtMilli).toBe(10000) // 2000 live - 1000 recorded
    expect(d.availableUsdtMilli).toBe(10000)
  })

  it("p2pMaxEgpPerUsdtMinor uses the range max, never the headline or average", async () => {
    const container = fakeContainer({
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          fetchedAt: "2026-01-01T00:00:00.000Z",
          source: "binance-p2p" as const,
          stale: false,
          range: { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10 },
        }),
      },
    })
    const d = await readTreasuryDashboard(container)
    expect(d.p2pEgpPerUsdtMinor).toBe(5200)
    expect(d.p2pMaxEgpPerUsdtMinor).toBe(5400)
  })

  it("p2pMaxEgpPerUsdtMinor is null when range is null", async () => {
    const container = fakeContainer({
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          fetchedAt: "2026-01-01T00:00:00.000Z",
          source: "binance-p2p" as const,
          stale: false,
          range: null,
        }),
      },
    })
    const d = await readTreasuryDashboard(container)
    expect(d.p2pEgpPerUsdtMinor).toBe(5200)
    expect(d.p2pMaxEgpPerUsdtMinor).toBeNull()
  })

  it("latest reconciliation and alerts returned", async () => {
    const now = new Date().toISOString()
    const rec = { id: "r1", expectedUsdtMilli: 10, supplierUsdtMilli: 20, gapUsdtMilli: 10, status: "OK", createdAt: now }
    const container = fakeContainer({
      reconciliations: { append: async () => {}, latest: async () => rec as any },
    })
    const d = await readTreasuryDashboard(container)
    expect(d.reconciliation).toEqual({ status: "OK", gapUsdtMilli: 10, createdAt: now })
  })

  it("fundings and deposits newest-first capped at 50", async () => {
    const items = Array.from({ length: 55 }, (_, i) => funding({ id: `f${i}`, egpPaidMinor: 100, usdtMilli: 1000, createdAt: new Date(Date.now() + i * 1000).toISOString() }))
    const container = fakeContainer({
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMilli: items.reduce((sum, f) => sum + f.usdtMilli, 0), basisEgpMinor: items.reduce((sum, f) => sum + f.egpPaidMinor, 0) }),
        listRecent: async () => items.slice(-50).reverse(),
        findById: async () => null,
        remove: async () => false,
      },
    })
    const d = await readTreasuryDashboard(container)
    expect(d.fundings).toHaveLength(50)
    expect(d.fundings[0].id).toBe("f54")
    expect(d.fundings[49].id).toBe("f5")
  })

  it("returns consumptions newest-first capped at 50", async () => {
    const items = Array.from({ length: 55 }, (_, i) =>
      treasuryConsumption({ id: `c${i}`, orderId: `o${i}`, usdtMilli: (100 + i) * 10, basisEgpMinor: 5000 + i, wacEgpMinor: 4900 + i, createdAt: new Date(Date.now() + i * 1000).toISOString() }),
    )
    const listRecent = vi.fn(async () => items.slice(-50).reverse())
    const container = fakeContainer({
      consumptions: {
        append: async () => {},
        totals: async () => ({ usdtMilli: 0, basisEgpMinor: 0 }),
        findByOrder: async () => null,
        sumUsdtSince: async () => 0,
        listRecent,
      },
    })
    const d = await readTreasuryDashboard(container)
    expect(listRecent).toHaveBeenCalledWith(50)
    expect(d.consumptions).toHaveLength(50)
    expect(d.consumptions[0]).toEqual({
      id: "c54",
      orderId: "o54",
      usdtMilli: 1540,
      basisEgpMinor: 5054,
      wacEgpMinor: 4954,
      createdAt: items[54].createdAt,
    })
    expect(d.consumptions[49].id).toBe("c5")
  })

  it("depositRates contains only EGP and USD", async () => {
    const d = await readTreasuryDashboard(fakeContainer())
    expect(d.depositRates).toHaveLength(2)
    expect(d.depositRates.map((r) => r.currency)).toEqual(["EGP", "USD"])
    expect(d.depositRates).toEqual([
      { currency: "EGP", rateMinor: 50 },
      { currency: "USD", rateMinor: 1 },
    ])
  })

  it("fundings exclude nothing — every recorded lot carries its basis", async () => {
    const confirmed = [
      funding({ id: "f1", egpPaidMinor: 10000, usdtMilli: 2000, createdAt: "2026-01-02T00:00:00.000Z" }),
    ]
    const container = fakeContainer({
      treasury: {
        snapshot: async () => ({ usdtMilli: 2000, basisEgpMinor: 10000, wacEgpMinor: 5000 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMilli: 0, createdAt: "now" }),
        consumeForOrder: async () => ({ id: "c", orderId: "o", usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0, createdAt: "now" }),
        reconcile: async () => ({ id: "r", expectedUsdtMilli: 0, supplierUsdtMilli: 0, gapUsdtMilli: 0, status: "OK", createdAt: "now" }),
      } as any,
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMilli: confirmed.reduce((sum, f) => sum + f.usdtMilli, 0), basisEgpMinor: confirmed.reduce((sum, f) => sum + f.egpPaidMinor, 0) }),
        listRecent: async () => confirmed,
        findById: async () => null,
        remove: async () => false,
      },
    })

    const d = await readTreasuryDashboard(container)
    expect(d.p2pEgpPerUsdtMinor).toBeNull()
    expect(d.freeUsdtMilli).toBe(8000) // 1000 live - 200 recorded
    expect(d.availableUsdtMilli).toBe(2000)
    expect(d.recordedUsdtMilli).toBe(2000)
    expect(d.recordedBasisEgpMinor).toBe(10000)
    expect(d.wacEgpMinor).toBe(5000)
    expect(d.fundings).toEqual([
      { id: "f1", egpPaidMinor: 10000, usdtMilli: 2000, createdAt: "2026-01-02T00:00:00.000Z" },
    ])
  })
})
