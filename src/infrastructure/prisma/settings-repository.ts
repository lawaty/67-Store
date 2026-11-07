/**
 * Prisma adapter for `SettingsRepository`: reads and upserts key-value
 * settings by key.
 */
import { PrismaClient } from "@prisma/client"
import { SettingsRepository } from "@/shared/settings-repository"

export function createPrismaSettingsRepository(db: PrismaClient): SettingsRepository {
  return {
    async get(key: string): Promise<string | null> {
      const row = await db.setting.findUnique({ where: { key } })
      if (row === null) {
        return null
      }
      return row.value
    },

    async set(key: string, value: string): Promise<void> {
      await db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    },

    async delete(key: string): Promise<void> {
      await db.setting.deleteMany({ where: { key } })
    },

    async all(): Promise<Record<string, string>> {
      const rows = await db.setting.findMany()
      const result: Record<string, string> = {}
      for (const row of rows) {
        result[row.key] = row.value
      }
      return result
    },
  }
}
