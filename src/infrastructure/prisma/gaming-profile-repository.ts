/**
 * Prisma adapter for `GamingProfileRepository`: manages gaming profiles per
 * account, treating duplicate inserts as idempotent upserts.
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
      return rows.map((row: any) => gamingProfile({ ...row, playerName: row.playerName ?? null }))
    },
    add: async (input: { id: string; clientId: string; accountId: string | null; userId: string; serverId: string; game: string; playerName?: string | null }) => {
      const row = await db.gamingProfile.upsert({
        where: { clientId_game_userId_serverId: { clientId: input.clientId, game: input.game, userId: input.userId, serverId: input.serverId } },
        update: { playerName: input.playerName ?? null, accountId: input.accountId },
        create: { id: input.id, clientId: input.clientId, accountId: input.accountId, userId: input.userId, serverId: input.serverId, game: input.game, playerName: input.playerName ?? null },
      })
      return gamingProfile({ ...row, playerName: row.playerName ?? null })
    },
    remove: async (id: string, accountId: string) => {
      await db.gamingProfile.deleteMany({
        where: { id, accountId },
      })
    },
  }
}
