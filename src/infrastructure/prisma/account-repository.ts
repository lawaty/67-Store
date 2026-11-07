/**
 * Prisma adapter for `AccountRepository`: persists client accounts and
 * per-account preferences, upserting preferences by account and key.
 */
import type { PrismaClient } from "@prisma/client"
import { AccountRepository, ClientAccount } from "@/accounts"

function map(row: { id: string; clientId: string; email: string; passwordHash: string }): ClientAccount {
  return { id: row.id, clientId: row.clientId, email: row.email, passwordHash: row.passwordHash }
}

export function createPrismaAccountRepository(db: PrismaClient): AccountRepository {
  return {
    findByEmail: async (email: string) => {
      const row = await db.clientAccount.findUnique({ where: { email } })
      if (row === null) return null
      return map(row)
    },
    findById: async (id: string) => {
      const row = await db.clientAccount.findUnique({ where: { id } })
      if (row === null) return null
      return map(row)
    },
    create: async (input) => {
      const row = await db.clientAccount.create({ data: input })
      return map(row)
    },
    list: async (input: { skip: number; take: number }) => {
      const [rows, total] = await Promise.all([
        db.clientAccount.findMany({
          skip: input.skip,
          take: input.take,
          orderBy: { createdAt: "desc" },
          include: { client: { include: { wallet: true } } },
        }),
        db.clientAccount.count(),
      ])
      return {
        rows: rows.map((row) => ({
          id: row.id,
          clientId: row.clientId,
          email: row.email,
          coinBalance: row.client.wallet?.coinBalance ?? 0,
          createdAt: row.createdAt.toISOString(),
        })),
        total,
      }
    },
    listPreferences: async (accountId: string) => {
      const rows = await db.preference.findMany({ where: { accountId } })
      const result: Record<string, string> = {}
      for (const row of rows) {
        result[row.key] = row.value
      }
      return result
    },
    setPreference: async (accountId: string, key: string, value: string) => {
      await db.preference.upsert({
        where: { accountId_key: { accountId, key } },
        create: { accountId, key, value },
        update: { value },
      })
    },
  }
}
