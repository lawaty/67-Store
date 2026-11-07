/**
 * Prisma adapter for `ProductRepository`: upserts products in a transaction
 * and manages active listings per game with soft-deactivation.
 */
import { PrismaClient } from "@prisma/client"
import { CostHistoryReader, ProductRepository } from "@/catalogue"
import { Product, product } from "@/catalogue"
import { money, CurrencyCode } from "../../shared/money"

function safePositiveInt(value: unknown, name: string): number {
  const n = typeof value === "bigint" ? Number(value) : Number(value)
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new RangeError(`${name} must be a safe positive integer`)
  }
  return n
}

export function createPrismaProductRepository(db: PrismaClient): ProductRepository & CostHistoryReader {
  return {
    upsertMany: async (products: readonly Product[]) => {
      if (products.length === 0) {
        return
      }
      await db.$transaction(
        products.map((p) => {
          const game = p.id.includes(":") ? p.id.split(":")[0] : ""
          return db.product.upsert({
            where: { id: p.id },
            create: {
              id: p.id,
              game,
              distributorId: p.distributorId,
              name: p.name,
              costMinor: p.cost.minor,
              currency: p.cost.currency,
              active: true,
              syncedAt: new Date(),
            },
            update: {
              distributorId: p.distributorId,
              name: p.name,
              costMinor: p.cost.minor,
              currency: p.cost.currency,
              active: true,
              syncedAt: new Date(),
            },
          })
        })
      )
    },
    listActive: async (game: string) => {
      const rows = await db.product.findMany({
        where: { game, active: true },
        orderBy: { costMinor: "asc" },
      })
      return rows.map((r) =>
        product({
          id: r.id,
          distributorId: r.distributorId,
          name: r.name,
          cost: money(r.costMinor, r.currency as CurrencyCode),
          game: r.game,
          active: r.active,
          syncedAt: r.syncedAt,
        })
      )
    },
    listAll: async (game: string) => {
      const rows = await db.product.findMany({
        where: { game },
        orderBy: [{ distributorId: "asc" }, { name: "asc" }],
      })
      return rows.map((r) =>
        product({
          id: r.id,
          distributorId: r.distributorId,
          name: r.name,
          cost: money(r.costMinor, r.currency as CurrencyCode),
          game: r.game,
          active: r.active,
          syncedAt: r.syncedAt,
        })
      )
    },
    deactivateExcept: async (game: string, keepIds: readonly string[]) => {
      const result = await db.product.updateMany({
        where: { game, active: true, id: { notIn: [...keepIds] } },
        data: { active: false },
      })
      return result.count
    },
    appendCostHistory: async (rows) => {
      if (rows.length === 0) {
        return
      }
      await db.productCostHistory.createMany({ data: rows.map((r) => ({ ...r })) })
    },
    listCostChangesSince: async (lastIndexedAt) => {
      if (lastIndexedAt === null) {
        return []
      }
      const rows = await db.$queryRawUnsafe(
        `SELECT p.id AS productId, p.costMinor AS currentCostMinor, (
          SELECT h.costMinor
          FROM \`ProductCostHistory\` h
          WHERE h.productId = p.id AND h.recordedAt <= ?
          ORDER BY h.recordedAt DESC, h.id DESC
          LIMIT 1
        ) AS previousCostMinor
        FROM \`Product\` p
        WHERE p.active = true
        HAVING previousCostMinor IS NOT NULL`,
        new Date(lastIndexedAt),
      ) as Array<{ productId: string; previousCostMinor: unknown; currentCostMinor: unknown }>
      return rows.map((r) => ({
        productId: String(r.productId),
        previousCostMinor: safePositiveInt(r.previousCostMinor, "previousCostMinor"),
        currentCostMinor: safePositiveInt(r.currentCostMinor, "currentCostMinor"),
      }))
    },
    latestCostRecordedAt: async () => {
      const result = await db.productCostHistory.aggregate({ _max: { recordedAt: true } })
      const max = result._max.recordedAt
      return max ? max.toISOString() : null
    },
  }
}
