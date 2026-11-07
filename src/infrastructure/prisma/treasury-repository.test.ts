import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaTreasuryRepositories } from "./treasury-repository"

function fakeDb(aggregateResult: { _sum: { usdtMinor: number | null } }) {
  return {
    treasuryConsumption: {
      aggregate: vi.fn().mockResolvedValue(aggregateResult),
    },
  } as unknown as PrismaClient
}

describe("createPrismaTreasuryRepositories.consumptions.sumUsdtSince", () => {
  it("sums usdtMinor for consumptions created at or after since", async () => {
    const db = {
      treasuryConsumption: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { usdtMinor: 12345 } }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).consumptions
    const result = await repo.sumUsdtSince("2026-01-01T00:00:00.000Z")
    expect(result).toBe(12345)
    expect((db as any).treasuryConsumption.aggregate).toHaveBeenCalledWith({
      _sum: { usdtMinor: true },
      where: { createdAt: { gte: new Date("2026-01-01T00:00:00.000Z") } },
    })
  })

  it("returns 0 when aggregate sum is null", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeDb({ _sum: { usdtMinor: null } })
    ).consumptions
    await expect(repo.sumUsdtSince("2026-01-01T00:00:00.000Z")).resolves.toBe(0)
  })

  it("returns 0 when aggregate sum is undefined", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeDb({ _sum: { usdtMinor: undefined as unknown as number | null } })
    ).consumptions
    await expect(repo.sumUsdtSince("2026-01-01T00:00:00.000Z")).resolves.toBe(0)
  })

  it("throws for negative sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeDb({ _sum: { usdtMinor: -1 } })
    ).consumptions
    await expect(repo.sumUsdtSince("2026-01-01T00:00:00.000Z")).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for malformed sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeDb({ _sum: { usdtMinor: 1.5 as unknown as number } })
    ).consumptions
    await expect(repo.sumUsdtSince("2026-01-01T00:00:00.000Z")).rejects.toBeInstanceOf(RangeError)
  })
})

describe("createPrismaTreasuryRepositories.consumptions.listRecent", () => {
  it("lists newest first with take limit and maps rows", async () => {
    const rows = [
      { id: "c1", orderId: "o1", usdtMinor: 100, basisEgpMinor: 5000, wacEgpMinor: 4800, createdAt: new Date("2026-01-03T00:00:00.000Z") },
      { id: "c2", orderId: "o2", usdtMinor: 200, basisEgpMinor: 10000, wacEgpMinor: 9800, createdAt: new Date("2026-01-02T00:00:00.000Z") },
    ]
    const db = {
      treasuryConsumption: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).consumptions
    const result = await repo.listRecent(50)
    expect((db as any).treasuryConsumption.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    expect(result).toEqual([
      { id: "c1", orderId: "o1", usdtMinor: 100, basisEgpMinor: 5000, wacEgpMinor: 4800, createdAt: "2026-01-03T00:00:00.000Z" },
      { id: "c2", orderId: "o2", usdtMinor: 200, basisEgpMinor: 10000, wacEgpMinor: 9800, createdAt: "2026-01-02T00:00:00.000Z" },
    ])
  })
})

function fakeFundingTotalsDb(aggregateResult: { _sum: { usdtMinor: number | null; egpPaidMinor: number | null } }) {
  return {
    funding: {
      aggregate: vi.fn().mockResolvedValue(aggregateResult),
    },
  } as unknown as PrismaClient
}

function fakeConsumptionTotalsDb(aggregateResult: { _sum: { usdtMinor: number | null; basisEgpMinor: number | null } }) {
  return {
    treasuryConsumption: {
      aggregate: vi.fn().mockResolvedValue(aggregateResult),
    },
  } as unknown as PrismaClient
}

describe("createPrismaTreasuryRepositories.fundings.totals", () => {
  it("sums usdtMinor and egpPaidMinor for fundings", async () => {
    const db = {
      funding: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { usdtMinor: 12345, egpPaidMinor: 67890 } }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).fundings
    const result = await repo.totals()
    expect(result).toEqual({ usdtMinor: 12345, basisEgpMinor: 67890 })
    expect((db as any).funding.aggregate).toHaveBeenCalledWith({
      _sum: { usdtMinor: true, egpPaidMinor: true },
    })
  })

  it("returns 0 for each sum when aggregate sums are null", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: null, egpPaidMinor: null } })
    ).fundings
    await expect(repo.totals()).resolves.toEqual({ usdtMinor: 0, basisEgpMinor: 0 })
  })

  it("returns 0 for each sum when aggregate sums are undefined", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: undefined as unknown as number | null, egpPaidMinor: undefined as unknown as number | null } })
    ).fundings
    await expect(repo.totals()).resolves.toEqual({ usdtMinor: 0, basisEgpMinor: 0 })
  })

  it("throws for negative usdtMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: -1, egpPaidMinor: 100 } })
    ).fundings
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for negative egpPaidMinor sum (basis)", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: 100, egpPaidMinor: -1 } })
    ).fundings
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for fractional usdtMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: 1.5 as unknown as number, egpPaidMinor: 100 } })
    ).fundings
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for fractional egpPaidMinor sum (basis)", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeFundingTotalsDb({ _sum: { usdtMinor: 100, egpPaidMinor: 1.5 as unknown as number } })
    ).fundings
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })
})

describe("createPrismaTreasuryRepositories.consumptions.totals", () => {
  it("sums usdtMinor and basisEgpMinor for all consumptions", async () => {
    const db = {
      treasuryConsumption: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { usdtMinor: 12345, basisEgpMinor: 67890 } }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).consumptions
    const result = await repo.totals()
    expect(result).toEqual({ usdtMinor: 12345, basisEgpMinor: 67890 })
    expect((db as any).treasuryConsumption.aggregate).toHaveBeenCalledWith({
      _sum: { usdtMinor: true, basisEgpMinor: true },
    })
  })

  it("returns 0 for each sum when aggregate sums are null", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: null, basisEgpMinor: null } })
    ).consumptions
    await expect(repo.totals()).resolves.toEqual({ usdtMinor: 0, basisEgpMinor: 0 })
  })

  it("returns 0 for each sum when aggregate sums are undefined", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: undefined as unknown as number | null, basisEgpMinor: undefined as unknown as number | null } })
    ).consumptions
    await expect(repo.totals()).resolves.toEqual({ usdtMinor: 0, basisEgpMinor: 0 })
  })

  it("throws for negative usdtMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: -1, basisEgpMinor: 100 } })
    ).consumptions
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for negative basisEgpMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: 100, basisEgpMinor: -1 } })
    ).consumptions
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for fractional usdtMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: 1.5 as unknown as number, basisEgpMinor: 100 } })
    ).consumptions
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for fractional basisEgpMinor sum", async () => {
    const repo = createPrismaTreasuryRepositories(
      fakeConsumptionTotalsDb({ _sum: { usdtMinor: 100, basisEgpMinor: 1.5 as unknown as number } })
    ).consumptions
    await expect(repo.totals()).rejects.toBeInstanceOf(RangeError)
  })
})

describe("createPrismaTreasuryRepositories.fundings.findById", () => {
  it("returns the funding lot via findUnique", async () => {
    const row = { id: "f1", egpPaidMinor: 5000, usdtMinor: 100, createdAt: new Date("2026-01-01T00:00:00.000Z") }
    const db = {
      funding: {
        findUnique: vi.fn().mockResolvedValue(row),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).fundings
    const result = await repo.findById("f1")
    expect((db as any).funding.findUnique).toHaveBeenCalledWith({ where: { id: "f1" } })
    expect(result).toEqual({ id: "f1", egpPaidMinor: 5000, usdtMinor: 100, createdAt: "2026-01-01T00:00:00.000Z" })
  })

  it("returns null when missing", async () => {
    const db = {
      funding: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).fundings
    await expect(repo.findById("missing")).resolves.toBeNull()
  })
})

describe("createPrismaTreasuryRepositories.fundings.remove", () => {
  it("hard-deletes via deleteMany and returns true when count > 0", async () => {
    const db = {
      funding: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).fundings
    await expect(repo.remove("f1")).resolves.toBe(true)
    expect((db as any).funding.deleteMany).toHaveBeenCalledWith({ where: { id: "f1" } })
  })

  it("returns false when count is 0", async () => {
    const db = {
      funding: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaTreasuryRepositories(db).fundings
    await expect(repo.remove("missing")).resolves.toBe(false)
  })
})
