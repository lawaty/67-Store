/**
 * Prisma adapter for `DepositRepository`: records deposits and computes the
 * coin WAC, summing EGP minor units and coins in one aggregate query.
 */
import type { PrismaClient } from "@prisma/client"
import { DepositRepository } from "@/treasury"
import { deposit } from "@/treasury"

function assertPositiveSafeInteger(n: number): void {
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new RangeError()
  }
}

function assertNonNegativeSafeInteger(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError()
  }
}

export function createPrismaDepositRepository(db: PrismaClient): DepositRepository {
  return {
    append: async (d) => {
      await db.deposit.create({
        data: {
          id: d.id,
          clientId: d.clientId,
          currency: d.currency,
          amountMinor: d.amountMinor,
          rateMinor: d.rateMinor,
          coins: d.coins,
          wacEgpMinor: d.wacEgpMinor,
          egpValueMinor: d.egpValueMinor,
          createdAt: new Date(d.createdAt),
        },
      })
    },
    list: async () => {
      const rows = await db.deposit.findMany({ orderBy: { createdAt: "asc" } })
      return rows.map((row) =>
        deposit({
          id: row.id,
          clientId: row.clientId,
          currency: row.currency as any,
          amountMinor: row.amountMinor,
          rateMinor: row.rateMinor,
          coins: row.coins,
          wacEgpMinor: row.wacEgpMinor,
          egpValueMinor: row.egpValueMinor,
          createdAt: row.createdAt.toISOString(),
        })
      )
    },
    listByClient: async (clientId: string, limit: number) => {
      assertPositiveSafeInteger(limit)
      const rows = await db.deposit.findMany({
        where: { clientId },
        orderBy: { createdAt: "asc" },
        take: limit,
      })
      return rows.map((row) =>
        deposit({
          id: row.id,
          clientId: row.clientId,
          currency: row.currency as any,
          amountMinor: row.amountMinor,
          rateMinor: row.rateMinor,
          coins: row.coins,
          wacEgpMinor: row.wacEgpMinor,
          egpValueMinor: row.egpValueMinor,
          createdAt: row.createdAt.toISOString(),
        })
      )
    },
    listRecent: async (limit: number) => {
      assertPositiveSafeInteger(limit)
      const rows = await db.deposit.findMany({ orderBy: { createdAt: "desc" }, take: limit })
      return rows.map((row) =>
        deposit({
          id: row.id,
          clientId: row.clientId,
          currency: row.currency as any,
          amountMinor: row.amountMinor,
          rateMinor: row.rateMinor,
          coins: row.coins,
          wacEgpMinor: row.wacEgpMinor,
          egpValueMinor: row.egpValueMinor,
          createdAt: row.createdAt.toISOString(),
        })
      )
    },
    listSince: async (since: string) => {
      const rows = await db.deposit.findMany({
        where: { createdAt: { gte: new Date(since) } },
        orderBy: { createdAt: "asc" },
      })
      return rows.map((row) =>
        deposit({
          id: row.id,
          clientId: row.clientId,
          currency: row.currency as any,
          amountMinor: row.amountMinor,
          rateMinor: row.rateMinor,
          coins: row.coins,
          wacEgpMinor: row.wacEgpMinor,
          egpValueMinor: row.egpValueMinor,
          createdAt: row.createdAt.toISOString(),
        })
      )
    },
    coinWacEgpMinor: async () => {
      const agg = await db.deposit.aggregate({
        _sum: { egpValueMinor: true, coins: true },
      })
      const egpSum = agg._sum.egpValueMinor
      const coinsSum = agg._sum.coins
      if (egpSum === null || egpSum === undefined || coinsSum === null || coinsSum === undefined) {
        return 0
      }
      assertNonNegativeSafeInteger(egpSum)
      assertNonNegativeSafeInteger(coinsSum)
      if (coinsSum === 0) return 0
      return Math.floor(egpSum / coinsSum + 0.5)
    },
  }
}
