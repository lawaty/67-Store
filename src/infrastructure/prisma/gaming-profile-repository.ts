/**
 * Prisma adapter for `GamingProfileRepository`: manages gaming profiles per
 * account, treating duplicate inserts as idempotent no-ops.
 */
import type { PrismaClient } from "@prisma/client"
import { GamingProfileRepository } from "@/accounts"
import { gamingProfile } from "@/accounts"

export function createPrismaGamingProfileRepository(db: PrismaClient): GamingProfileRepository {
  return {
    listByAccount: async (accountId: string) => {
      const rows = await db.gamingProfile.findMany({
        where: { accountId },
        orderBy: { createdAt: "asc" },
      })
      return rows.map((row: any) => gamingProfile({ ...row, playerName: row.playerName ?? null, game: row.game || "mlbb" }))
    },
    add: async (input: { id: string; accountId: string; label: string; userId: string; serverId: string; game: string; playerName?: string | null }) => {
      try {
        await db.gamingProfile.create({
          data: { ...input, playerName: input.playerName ?? null },
        })
      } catch (err: any) {
        if (err?.code === "P2002") {
          return
        }
        throw err
      }
    },
    remove: async (id: string, accountId: string) => {
      await db.gamingProfile.deleteMany({
        where: { id, accountId },
      })
    },
  }
}
