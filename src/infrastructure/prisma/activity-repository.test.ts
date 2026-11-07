import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaActivityRepository } from "./activity-repository"

const since = new Date("2026-10-07T00:00:00.000Z")

function makeDb(depositSum?: number | null, orderSum?: number | null) {
  const depositAggregate = vi.fn().mockResolvedValue({ _sum: { coins: depositSum } })
  const orderAggregate = vi.fn().mockResolvedValue({ _sum: { coinsConsumed: orderSum } })
  const db = {
    deposit: { aggregate: depositAggregate },
    order: { aggregate: orderAggregate },
  } as unknown as PrismaClient
  return { db, depositAggregate, orderAggregate }
}

describe("createPrismaActivityRepository.sumQualifiedVolumeSince", () => {
  it("sums deposit coins and delivered non-coin-paid consumed coins with exact where filters", async () => {
    const { db, depositAggregate, orderAggregate } = makeDb(300, 700)
    const repo = createPrismaActivityRepository(db)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).resolves.toBe(1000)
    expect(depositAggregate).toHaveBeenCalledWith({
      _sum: { coins: true },
      where: { clientId: "c1", createdAt: { gte: since } },
    })
    expect(orderAggregate).toHaveBeenCalledWith({
      _sum: { coinsConsumed: true },
      where: {
        clientId: "c1",
        status: "DELIVERED",
        createdAt: { gte: since },
        OR: [{ coinsCharged: null }, { coinsCharged: 0 }],
      },
    })
  })

  it("treats null sums as 0", async () => {
    const { db } = makeDb(null, null)
    const repo = createPrismaActivityRepository(db)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).resolves.toBe(0)
  })

  it("treats undefined sums as 0", async () => {
    const { db } = makeDb(undefined as unknown as number | null, undefined as unknown as number | null)
    const repo = createPrismaActivityRepository(db)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).resolves.toBe(0)
  })

  it("throws RangeError for a non-safe-integer total", async () => {
    const { db } = makeDb(1.5, 0)
    const repo = createPrismaActivityRepository(db)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).rejects.toBeInstanceOf(RangeError)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).rejects.toThrow("qualified volume must be a non-negative safe integer")
  })

  it("throws RangeError for a negative total", async () => {
    const { db } = makeDb(-5, 0)
    const repo = createPrismaActivityRepository(db)
    await expect(repo.sumQualifiedVolumeSince("c1", since)).rejects.toBeInstanceOf(RangeError)
  })
})
