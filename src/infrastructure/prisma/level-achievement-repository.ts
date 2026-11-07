/**
 * Prisma adapter for `LevelAchievementRepository`: upserts earned levels with
 * first-earn-wins semantics so repeated evaluation never rewrites the snapshot.
 */
import type { PrismaClient } from "@prisma/client"
import type { EarnedLevel, LevelAchievementRepository } from "@/ordering"

export function createPrismaLevelAchievementRepository(db: PrismaClient): LevelAchievementRepository {
  return {
    earn: async (input) => {
      if (typeof input.clientId !== "string" || input.clientId.trim().length === 0) {
        throw new RangeError("clientId must be non-empty")
      }
      if (typeof input.levelKey !== "string" || input.levelKey.trim().length === 0) {
        throw new RangeError("levelKey must be non-empty")
      }
      if (!Number.isSafeInteger(input.coins) || input.coins < 0) {
        throw new RangeError("coins must be a non-negative safe integer")
      }
      const earnedAt = new Date(input.earnedAt)
      if (Number.isNaN(earnedAt.getTime())) {
        throw new RangeError("earnedAt must be a valid date")
      }
      await db.levelAchievement.upsert({
        where: { clientId_levelKey: { clientId: input.clientId, levelKey: input.levelKey } },
        create: {
          clientId: input.clientId,
          levelKey: input.levelKey,
          coins: input.coins,
          title: input.title,
          icon: input.icon,
          color: input.color,
          earnedAt,
        },
        update: {},
      })
    },
    listByClient: async (clientId: string): Promise<EarnedLevel[]> => {
      const rows = await db.levelAchievement.findMany({
        where: { clientId },
        orderBy: [{ coins: "asc" }],
      })
      return rows.map((row) => ({
        levelKey: row.levelKey,
        coins: row.coins,
        title: row.title,
        icon: row.icon,
        color: row.color,
        earnedAt: row.earnedAt.toISOString(),
      }))
    },
  }
}
