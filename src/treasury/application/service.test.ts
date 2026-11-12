import { describe, expect, it, vi } from "vitest"
import fc from "fast-check"
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
      usdtMilli: items.reduce((sum, f) => sum + f.usdtMilli, 0),
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
      usdtMilli: items.reduce((sum, c) => sum + c.usdtMilli, 0),
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
    expect(snap).toEqual({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0 })
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
      usdtMilli: 1000,
    })
    const snap = await service.snapshot()
    expect(snap.usdtMilli).toBe(1000)
    expect(snap.basisEgpMinor).toBe(10000)
    expect(snap.wacEgpMinor).toBe(10000) // 10000*1000/1000 = 10000
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
      usdtMilli: 500,
    })
    await service.recordFunding({
      egpPaidMinor: 3000, // 50 USDT for 3000 EGP
      usdtMilli: 500,
    })
    const snap = await service.snapshot()
    expect(snap.usdtMilli).toBe(1000)
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
      usdtMilli: 1000,
    })
    const first = await service.consumeForOrder({
      orderId: "o1",
      costUsdtMilli: 100,
    })
    expect(first.orderId).toBe("o1")
    const second = await service.consumeForOrder({
      orderId: "o1",
      costUsdtMilli: 100,
    })
    expect(second).toBe(first) // same object
    expect(await consumptions.totals()).toEqual({ usdtMilli: 100, basisEgpMinor: 500 })
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
      usdtMilli: 100,
    })
    await expect(
      service.consumeForOrder({
        orderId: "o1",
        costUsdtMilli: 110,
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
      usdtMilli: 1000,
    })
    // OK
    const ok = await service.reconcile({ supplierUsdtMilli: 1000, toleranceUsdtMilli: 0 })
    expect(ok.status).toBe("OK")
    // GAP: supplier less than expected
    const gap = await service.reconcile({ supplierUsdtMilli: 990, toleranceUsdtMilli: 0 })
    expect(gap.status).toBe("GAP")
    // UNRECORDED_FUNDING
    const unf = await service.reconcile({ supplierUsdtMilli: 1010, toleranceUsdtMilli: 0 })
    expect(unf.status).toBe("UNRECORDED_FUNDING")
    expect((await reconciliations.list()).length).toBe(3)
    const latest = await reconciliations.latest()
    expect(latest?.status).toBe("UNRECORDED_FUNDING")
  })

  it("consumeForOrder keeps WAC funding-derived and debits pro-rata", async () => {
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: (() => { let n = 0; return () => `c-${++n}` })(),
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({ egpPaidMinor: 294976, usdtMilli: 54310 })
    expect((await service.snapshot()).wacEgpMinor).toBe(5431)

    const expectedBasis = [93365, 93365, 93474]
    const costs = [17190, 17190, 17210]
    for (let i = 0; i < costs.length; i += 1) {
      const c = await service.consumeForOrder({
        orderId: `o-${i}`,
        costUsdtMilli: costs[i]!,
      })
      expect(c.basisEgpMinor).toBe(expectedBasis[i])
      expect(c.wacEgpMinor).toBe(5431)
      expect((await service.snapshot()).wacEgpMinor).toBe(5431)
    }

    const last = await service.consumeForOrder({
      orderId: "o-last",
      costUsdtMilli: 2720,
    })
    expect(last.basisEgpMinor).toBe(14773)
    expect(await service.snapshot()).toEqual({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0 })
  })

  it("WAC changes only when funding changes, never when an order consumes", async () => {
    const service = createTreasuryService({
      fundings: createFundingRepo(),
      consumptions: createConsumptionRepo(),
      reconciliations: createReconciliationRepo(),
      newId: (() => { let n = 0; return () => `s-${++n}` })(),
      now: () => "2026-01-01T00:00:00Z",
    })
    await service.recordFunding({ egpPaidMinor: 5000, usdtMilli: 1000 })
    expect((await service.snapshot()).wacEgpMinor).toBe(5000)

    await service.consumeForOrder({ orderId: "o1", costUsdtMilli: 300 })
    expect((await service.snapshot()).wacEgpMinor).toBe(5000)
    expect((await service.snapshot()).basisEgpMinor).toBe(3500)

    await service.recordFunding({ egpPaidMinor: 6000, usdtMilli: 1000 })
    expect((await service.snapshot()).wacEgpMinor).toBe(5500)

    await service.consumeForOrder({ orderId: "o2", costUsdtMilli: 500 })
    expect((await service.snapshot()).wacEgpMinor).toBe(5500)
    expect((await service.snapshot()).basisEgpMinor).toBe(6600)
  })

  it("WAC is invariant under any consumption sequence (property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 1_000_000_000 }),
        fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 1, maxLength: 8 }),
        async (fundingUsdt, fundingBasis, costs) => {
          let n = 0
          const service = createTreasuryService({
            fundings: createFundingRepo(),
            consumptions: createConsumptionRepo(),
            reconciliations: createReconciliationRepo(),
            newId: () => `p-${++n}`,
            now: () => "2026-01-01T00:00:00Z",
          })
          const fundingUsdtMilli = fundingUsdt * 10
          await service.recordFunding({ egpPaidMinor: fundingBasis, usdtMilli: fundingUsdtMilli })
          const initial = (await service.snapshot()).wacEgpMinor
          let spent = 0
          for (const cost of costs) {
            if (spent + cost > fundingUsdtMilli) break
            await service.consumeForOrder({ orderId: `o-${spent}-${cost}`, costUsdtMilli: cost })
            spent += cost
            const snap = await service.snapshot()
            if (snap.usdtMilli > 0) {
              expect(snap.wacEgpMinor).toBe(initial)
            } else {
              expect(snap.wacEgpMinor).toBe(0)
            }
          }
        },
      ),
      { numRuns: 50 },
    )
  })

  it("recordFunding requires positive egpPaidMinor and usdtMilli", async () => {
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
        usdtMilli: 1000,
      })
    ).rejects.toThrow(RangeError)
    await expect(
      service.recordFunding({
        egpPaidMinor: 100,
        usdtMilli: 0,
      })
    ).rejects.toThrow(RangeError)
    const ok = await service.recordFunding({
      egpPaidMinor: 105,
      usdtMilli: 100,
    })
    expect(ok.egpPaidMinor).toBe(105)
  })
})

  it("runs consumeForOrder inside the injected transaction using the tx repos", async () => {
    let id = 0
    const fundings = createFundingRepo()
    const consumptions = createConsumptionRepo()
    const reconciliations = createReconciliationRepo()
    fundings.append({
      id: "f-seed",
      egpPaidMinor: 10000,
      usdtMilli: 1000,
      createdAt: "2026-01-01T00:00:00Z",
    } as any)
    const runInTransaction = vi.fn(async (fn) => fn({ fundings, consumptions, reconciliations }))
    const service = createTreasuryService({
      fundings,
      consumptions,
      reconciliations,
      newId: () => `id-${++id}`,
      now: () => "2026-01-01T00:00:00Z",
      runInTransaction,
    })
    const consumption = await service.consumeForOrder({ orderId: "o-tx", costUsdtMilli: 100 })
    expect(runInTransaction).toHaveBeenCalledOnce()
    expect(consumption.orderId).toBe("o-tx")
    expect(await consumptions.findByOrder("o-tx")).toEqual(consumption)
  })
