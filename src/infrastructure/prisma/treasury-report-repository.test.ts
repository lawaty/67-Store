import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaTreasuryReportRepository } from "./treasury-report-repository"

function fakeDb(queryResults: Array<any>[]) {
  const q = vi.fn()
  for (let i = 0; i < queryResults.length; i++) {
    q.mockResolvedValueOnce(queryResults[i])
  }
  return {
    $queryRawUnsafe: q,
  } as unknown as PrismaClient
}

describe("createPrismaTreasuryReportRepository.wacSeriesSince", () => {
  it("a consumption-only day does not move the funding-derived WAC", async () => {
    const db = fakeDb([
      // funding
      [
        { day: "2026-01-01", usdtMilli: 10000, basisEgpMinor: 30000 },
      ],
      // consumption
      [
        { day: "2026-01-02", usdtMilli: 5000, basisEgpMinor: 16000 },
      ],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    const res = await repo.wacSeriesSince("2026-01-01")
    expect(res).toEqual([
      { day: "2026-01-01", wacEgpMinor: 3000 },
      { day: "2026-01-02", wacEgpMinor: 3000 },
    ])
  })

  it("a consumption that drains the funding balance makes the WAC zero", async () => {
    const db = fakeDb([
      [ { day: "2026-01-01", usdtMilli: 10000, basisEgpMinor: 30000 } ],
      [ { day: "2026-01-02", usdtMilli: 10000, basisEgpMinor: 30000 } ],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    const res = await repo.wacSeriesSince("2026-01-01")
    expect(res).toEqual([
      { day: "2026-01-01", wacEgpMinor: 3000 },
      { day: "2026-01-02", wacEgpMinor: 0 },
    ])
  })

  it("since filters earlier days out while cumulative math still includes them", async () => {
    const db = fakeDb([
      // funding all
      [
        { day: "2026-01-01", usdtMilli: 10000, basisEgpMinor: 30000 },
      ],
      // consumption
      [],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    const res = await repo.wacSeriesSince("2026-01-02")
    expect(res).toEqual([])
  })

  it("empty tables → []", async () => {
    const db = fakeDb([[], []])
    const repo = createPrismaTreasuryReportRepository(db)
    const res = await repo.wacSeriesSince("2026-01-01")
    expect(res).toEqual([])
  })

  it("malformed row → throw", async () => {
    const db = fakeDb([
      [
        { day: "bad", usdtMilli: 1000, basisEgpMinor: 30000 },
      ],
      [],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    await expect(repo.wacSeriesSince("2026-01-01")).rejects.toBeInstanceOf(RangeError)
  })
})
