/**
 * Prisma adapter for `ClientRepository`: upserts and loads client records,
 * mapping persisted rows to the `Client` domain aggregate.
 */
import type { PrismaClient } from "@prisma/client"
import { ClientRepository } from "@/accounts"
import { Client, client } from "@/accounts"

export function createPrismaClientRepository(db: PrismaClient): ClientRepository {
  return {
    save: async (c: Client) => {
      await db.client.upsert({
        where: { id: c.id },
        create: { id: c.id },
        update: {},
      })
    },
    findById: async (id: string) => {
      const row = await db.client.findUnique({ where: { id } })
      if (row === null) {
        return null
      }
      return client(row.id)
    },
  }
}
