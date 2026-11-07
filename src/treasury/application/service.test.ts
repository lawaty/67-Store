import { describe, expect, it } from "vitest"
import { createTreasuryService } from "./service"
import { FundingRepository } from "../ports/funding-repository"
import { ConsumptionRepository } from "../ports/consumption-repository"
import { ReconciliationRepository } from "../ports/reconciliation-repository"
import { Funding } from "../domain/funding"
import { TreasuryConsumption } from "../domain/consumption"
import { ReconciliationRecord } from "../ports/reconciliation-repository"

function createFundingRepo(): FundingRepository {
  const items: Funding[] = []
  return {
    append: async (lot: Funding) => {
      items.push(lot)
    },
    totals: async () => ({
      usdtMinor: items.reduce((sum, f) => sum + f.usdtMinor, 0),
      basisEgpMinor: items.reduce((sum, f) => sum + f.egpPaidMinor, 0),
    }),
    listRecent: async (limit: number) => {
      const copy = items.slice()
      copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      return copy.slice(0, limit)
    },
    findById: async (id: string) => items.find((f) => f.id === id) ?? null,
    remove: async (id: string) => {
      const index = items.findIndex((f) => f.id === id)
      if (index === -1) return false
      items.splice(index, 1)
      return true
    },
  }
}

function createConsumptionRepo(): ConsumptionRepository & { setSumUsdtSince(v: number): void } {
  const items: TreasuryConsumption[] = []
  let sumUsdtSinceValue = 0
  return {
    append: async (consumption: TreasuryConsumption) => {
      items.push(consumption)
    },
    findByOrder: async (orderId: string) => {
      return items.find((c) => c.orderId === orderId) ?? null
    },
    totals: async () => ({
      usdtMinor: items.reduce((sum, c) => sum + c.usdtMinor, 0),
      basisEgpMinor: items.reduce((sum, c) => sum + c.basisEgpMinor, 0),
    }),
    sumUsdtSince: async () => sumUsdtSinceValue,
    listRecent: async (limit: number) => {
      const copy = items.slice()
      copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      return copy.slice(0, limit)
    },
    setSumUsdtSince: (v: number) => {
      sumUsdtSinceValue = v
    },
  }
}

function createReconciliationRepo(): ReconciliationRepository & { list(): Promise<ReconciliationRecord[]> } {
  const items: ReconciliationRecord[] = []
  return {
    append: async (record: ReconciliationRecord) => {
      items.push(record)
    },
    latest: async () => {
      if (items.length === 0) return null
      return items[items.length - 1]
    },
    list: async () => items.slice(),
  }
}

describe("treasury service", () => {
  it("empty snapshot (0/0/0)", async () => {
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: () => "id",
      now: () => "2026-01-01T00:00:00Z",
    })
    const snap = await service.snapshot()
    expect(snap).toEqual({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 })
  })

  it("record a funding then snapshot WAC", async () => {
    let id = 0
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: () => `f-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({
      egpPaidMinor: 10000,
      usdtMinor: 100,
    })
    const snap = await service.snapshot()
    expect(snap.usdtMinor).toBe(100)
    expect(snap.basisEgpMinor).toBe(10000)
    expect(snap.wacEgpMinor).toBe(10000) // 10000*100/100 = 10000
  })

  it("two fundings blend the WAC (the spec example)", async () => {
    let id = 0
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: () => `f-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({
      egpPaidMinor: 2500, // 50 USDT for 2500 EGP
      usdtMinor: 50,
    })
    await service.recordFunding({
      egpPaidMinor: 3000, // 50 USDT for 3000 EGP
      usdtMinor: 50,
    })
    const snap = await service.snapshot()
    expect(snap.usdtMinor).toBe(100)
    expect(snap.basisEgpMinor).toBe(5500)
    // wac = round(5500*100/100)=5500
    expect(snap.wacEgpMinor).toBe(5500)
  })

  it("consumeForOrder writes one consumption and is idempotent on a second call", async () => {
    let id = 0
    const fundings = createFundingRepo()
    const consumptions = createConsumptionRepo()
    const service = createTreasuryService({
      fundings,
      consumptions,
      reconciliations: createReconciliationRepo(),
      newId: () => `id-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({
      egpPaidMinor: 5000,
      usdtMinor: 100,
    })
    const first = await service.consumeForOrder({
      orderId: "o1",
      costUsdtMinor: 10,
      wacEgpMinor: 50,
      cogsEgpMinor: 500,
    })
    expect(first.orderId).toBe("o1")
    const second = await service.consumeForOrder({
      orderId: "o1",
      costUsdtMinor: 10,
      wacEgpMinor: 50,
      cogsEgpMinor: 500,
    })
    expect(second).toBe(first) // same object
    expect(await consumptions.totals()).toEqual({ usdtMinor: 10, basisEgpMinor: 500 })
  })

  it("consumeForOrder throws when the cost exceeds the treasury", async () => {
    let id = 0
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: () => `id-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({
      egpPaidMinor: 100,
      usdtMinor: 10,
    })
    await expect(
      service.consumeForOrder({
        orderId: "o1",
        costUsdtMinor: 11,
        wacEgpMinor: 10,
        cogsEgpMinor: 110,
      })
    ).rejects.toThrow(RangeError)
  })

  it("reconcile returns the right status and appends one record (OK, GAP, UNRECORDED_FUNDING)", async () => {
    let id = 0
    const reconciliations = createReconciliationRepo()
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations,
      newId: () => `r-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({
      egpPaidMinor: 5000,
      usdtMinor: 100,
    })
    // OK
    const ok = await service.reconcile({ supplierUsdtMinor: 100, toleranceUsdtMinor: 0 })
    expect(ok.status).toBe("OK")
    // GAP: supplier less than expected
    const gap = await service.reconcile({ supplierUsdtMinor: 99, toleranceUsdtMinor: 0 })
    expect(gap.status).toBe("GAP")
    // UNRECORDED_FUNDING
    const unf = await service.reconcile({ supplierUsdtMinor: 101, toleranceUsdtMinor: 0 })
    expect(unf.status).toBe("UNRECORDED_FUNDING")
    expect((await reconciliations.list()).length).toBe(3)
    const latest = await reconciliations.latest()
    expect(latest?.status).toBe("UNRECORDED_FUNDING")
  })

  it("recordFunding requires positive egpPaidMinor and usdtMinor", async () => {
    let id = 0
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: () => `f-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
    })
    await expect(
      service.recordFunding({
        egpPaidMinor: 0,
        usdtMinor: 100,
      })
    ).rejects.toThrow(RangeError)
    await expect(
      service.recordFunding({
        egpPaidMinor: 100,
        usdtMinor: 0,
      })
    ).rejects.toThrow(RangeError)
    const ok = await service.recordFunding({
      egpPaidMinor: 105,
      usdtMinor: 10,
    })
    expect(ok.egpPaidMinor).toBe(105)
  })
})
