/**
 * Prisma adapter for `AchievementRepository`: persists achievement rules and
 * tracks per-client progress toward each rule.
 */
import type { PrismaClient } from "@prisma/client"
import type { AchievementRepository, AchievementRule, ClientAchievementProgress } from "@/ordering"
import { achievementRule } from "@/ordering"

type AchievementRow = {
  id: string
  title: string
  description: string
  icon: string
  color: string
  type: AchievementRule["type"]
  target: number
  active: boolean
  sortOrder: number
}

function toRule(row: AchievementRow): AchievementRule {
  return achievementRule({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    type: row.type,
    target: row.target,
    active: row.active,
    sortOrder: row.sortOrder,
  })
}

export function createPrismaAchievementRepository(db: PrismaClient): AchievementRepository {
  return {
    listAll: async (): Promise<AchievementRule[]> => {
      const rows = await db.achievement.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
      return rows.map((row) => toRule(row))
    },
    listActive: async (): Promise<AchievementRule[]> => {
      const rows = await db.achievement.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
      return rows.map((row) => toRule(row))
    },
    create: async (input): Promise<AchievementRule> => {
      const row = await db.achievement.create({
        data: {
          id: input.id,
          title: input.title,
          description: input.description,
          icon: input.icon,
          color: input.color,
          type: input.type,
          target: input.target,
          active: input.active,
          sortOrder: input.sortOrder,
        },
      })
      return toRule(row)
    },
    update: async (id, input): Promise<AchievementRule> => {
      const row = await db.achievement.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          icon: input.icon,
          color: input.color,
          type: input.type,
          target: input.target,
          active: input.active,
          sortOrder: input.sortOrder,
        },
      })
      return toRule(row)
    },
    remove: async (id: string): Promise<void> => {
      await db.achievement.delete({ where: { id } })
    },
    listProgress: async (clientId: string): Promise<ClientAchievementProgress[]> => {
      const rows = await db.clientAchievement.findMany({ where: { clientId } })
      return rows.map((row) => ({
        achievementId: row.achievementId,
        count: row.count,
        earnedAt: row.earnedAt ? row.earnedAt.toISOString() : null,
      }))
    },
    upsertProgress: async (input): Promise<void> => {
      await db.clientAchievement.upsert({
        where: {
          clientId_achievementId: {
            clientId: input.clientId,
            achievementId: input.achievementId,
          },
        },
        update: {
          count: input.count,
          earnedAt: input.earnedAt === null ? null : new Date(input.earnedAt),
        },
        create: {
          clientId: input.clientId,
          achievementId: input.achievementId,
          count: input.count,
          earnedAt: input.earnedAt === null ? null : new Date(input.earnedAt),
        },
      })
    },
  }
}
