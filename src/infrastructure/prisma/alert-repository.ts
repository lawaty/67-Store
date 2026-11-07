/**
 * Prisma adapter for `AlertRepository`: appends alerts and lists recent
 * entries ordered by creation time.
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { AlertRepository, Alert } from "@/alerts"

export function createPrismaAlertRepository(db: PrismaClient): AlertRepository {
  return {
    append: async (input) => {
      const row = await db.alert.create({
        data: {
          id: randomUUID(),
          kind: input.kind,
          message: input.message,
        },
      })
      return {
        id: row.id,
        kind: row.kind,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      }
    },
    listRecent: async (limit) => {
      const rows = await db.alert.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      }))
    },
  }
}
