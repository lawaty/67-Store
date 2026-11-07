import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaLevelAchievementRepository } from "./level-achievement-repository"

const iso = "2026-11-06T12:00:00.000Z"

function makeDb() {
  const upsert = vi.fn(async (_args: unknown): Promise<unknown> => ({}))
  const findMany = vi.fn(async (_args: unknown): Promise<unknown[]> => [])
  const db = {
    levelAchievement: { upsert, findMany },
  } as unknown as PrismaClient
  return { db, upsert, findMany }
}

describe("createPrismaLevelAchievementRepository.earn", () => {
  it("sends the exact upsert shape with update {} and a Date matching the ISO input", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await repo.earn({
      clientId: "c1",
      levelKey: "mythic",
      coins: 1000,
      title: "Mythic",
      icon: "gem",
      color: "gold",
      earnedAt: iso,
    })
    expect(upsert).toHaveBeenCalledTimes(1)
    const arg = upsert.mock.calls[0][0] as {
      where: { clientId_levelKey: { clientId: string; levelKey: string } }
      create: { clientId: string; levelKey: string; coins: number; title: string; icon: string; color: string; earnedAt: Date }
      update: Record<string, unknown>
    }
    expect(arg.where).toEqual({ clientId_levelKey: { clientId: "c1", levelKey: "mythic" } })
    expect(arg.update).toEqual({})
    expect(arg.create).toMatchObject({
      clientId: "c1",
      levelKey: "mythic",
      coins: 1000,
      title: "Mythic",
      icon: "gem",
      color: "gold",
    })
    expect(arg.create.earnedAt).toBeInstanceOf(Date)
    expect(arg.create.earnedAt.toISOString()).toBe(iso)
  })

  it("throws RangeError for empty clientId", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await expect(
      repo.earn({ clientId: "", levelKey: "epic", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: iso }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("throws RangeError for empty levelKey", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await expect(
      repo.earn({ clientId: "c1", levelKey: "", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: iso }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("throws RangeError for negative coins", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await expect(
      repo.earn({ clientId: "c1", levelKey: "epic", coins: -1, title: "Epic", icon: "shield", color: "sky", earnedAt: iso }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("throws RangeError for non-integer coins", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await expect(
      repo.earn({ clientId: "c1", levelKey: "epic", coins: 1.5, title: "Epic", icon: "shield", color: "sky", earnedAt: iso }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("throws RangeError for invalid earnedAt", async () => {
    const { db, upsert } = makeDb()
    const repo = createPrismaLevelAchievementRepository(db)
    await expect(
      repo.earn({ clientId: "c1", levelKey: "epic", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: "not-a-date" }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe("createPrismaLevelAchievementRepository.listByClient", () => {
  it("filters by client, orders by coins asc, and maps earnedAt to ISO", async () => {
    const { db, findMany } = makeDb()
    const earned = new Date(iso)
    findMany.mockResolvedValue([
      { levelKey: "epic", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: earned },
      { levelKey: "mythic", coins: 1000, title: "Mythic", icon: "gem", color: "gold", earnedAt: earned },
    ])
    const repo = createPrismaLevelAchievementRepository(db)
    const result = await repo.listByClient("c1")
    expect(findMany).toHaveBeenCalledWith({
      where: { clientId: "c1" },
      orderBy: [{ coins: "asc" }],
    })
    expect(result).toEqual([
      { levelKey: "epic", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: iso },
      { levelKey: "mythic", coins: 1000, title: "Mythic", icon: "gem", color: "gold", earnedAt: iso },
    ])
  })
})
