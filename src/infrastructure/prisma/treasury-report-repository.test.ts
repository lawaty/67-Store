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
  it("two series with funding on day 1 and consumption on day 2 produce a decreasing-cost point on day 2", async () => {
    const db = fakeDb([
      // funding
      [
        { day: "2026-01-01", usdtMinor: 1000, basisEgpMinor: 30000 },
      ],
      // consumption
      [
        { day: "2026-01-02", usdtMinor: 500, basisEgpMinor: 16000 },
      ],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    const res = await repo.wacSeriesSince("2026-01-01")
    expect(res).toEqual([
      { day: "2026-01-01", wacEgpMinor: 3000 },
      { day: "2026-01-02", wacEgpMinor: 2800 },
    ])
  })

  it("since filters earlier days out while cumulative math still includes them", async () => {
    const db = fakeDb([
      // funding all
      [
        { day: "2026-01-01", usdtMinor: 1000, basisEgpMinor: 30000 },
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
        { day: "bad", usdtMinor: 1000, basisEgpMinor: 30000 },
      ],
      [],
    ])
    const repo = createPrismaTreasuryReportRepository(db)
    await expect(repo.wacSeriesSince("2026-01-01")).rejects.toBeInstanceOf(RangeError)
  })
})
