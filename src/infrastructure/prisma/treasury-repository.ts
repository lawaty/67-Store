/**
 * Prisma adapters for `FundingRepository`, `ConsumptionRepository`, and
 * `ReconciliationRepository`, persisting treasury records.
 */
import { PrismaClient } from "@prisma/client"
import { FundingRepository } from "@/treasury"
import { ConsumptionRepository } from "@/treasury"
import { ReconciliationRepository } from "@/treasury"
import { Funding, funding } from "@/treasury"
import { treasuryConsumption } from "@/treasury"
import { ReconciliationRecord } from "@/treasury"

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

function toFunding(row: {
  id: string
  egpPaidMinor: number
  usdtMinor: number
  createdAt: Date
}): Funding {
  return funding({
    id: row.id,
    egpPaidMinor: row.egpPaidMinor,
    usdtMinor: row.usdtMinor,
    createdAt: row.createdAt.toISOString(),
  })
}

export function createPrismaTreasuryRepositories(db: PrismaClient): {
  fundings: FundingRepository
  consumptions: ConsumptionRepository
  reconciliations: ReconciliationRepository
} {
  return {
    fundings: {
      append: async (lot) => {
        await db.funding.create({
          data: {
            id: lot.id,
            egpPaidMinor: lot.egpPaidMinor,
            usdtMinor: lot.usdtMinor,
            createdAt: new Date(lot.createdAt),
          },
        })
      },
      totals: async () => {
        const agg = await db.funding.aggregate({
          _sum: { usdtMinor: true, egpPaidMinor: true },
        })
        const usdtMinor = agg._sum.usdtMinor ?? 0
        const basisEgpMinor = agg._sum.egpPaidMinor ?? 0
        assertNonNegativeSafeInteger(usdtMinor)
        assertNonNegativeSafeInteger(basisEgpMinor)
        return { usdtMinor, basisEgpMinor }
      },
      listRecent: async (limit: number) => {
        assertPositiveSafeInteger(limit)
        const rows = await db.funding.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        return rows.map((row) => toFunding(row))
      },
      findById: async (id: string) => {
        const row = await db.funding.findUnique({ where: { id } })
        if (row === null) {
          return null
        }
        return toFunding(row)
      },
      remove: async (id: string) => {
        const result = await db.funding.deleteMany({ where: { id } })
        return result.count > 0
      },
    },
    consumptions: {
      append: async (consumption) => {
        await db.treasuryConsumption.create({
          data: {
            id: consumption.id,
            orderId: consumption.orderId,
            usdtMinor: consumption.usdtMinor,
            basisEgpMinor: consumption.basisEgpMinor,
            wacEgpMinor: consumption.wacEgpMinor,
            createdAt: new Date(consumption.createdAt),
          },
        })
      },
      findByOrder: async (orderId: string) => {
        const row = await db.treasuryConsumption.findUnique({ where: { orderId } })
        if (row === null) {
          return null
        }
        return treasuryConsumption({
          id: row.id,
          orderId: row.orderId,
          usdtMinor: row.usdtMinor,
          basisEgpMinor: row.basisEgpMinor,
          wacEgpMinor: row.wacEgpMinor,
          createdAt: row.createdAt.toISOString(),
        })
      },
      totals: async () => {
        const agg = await db.treasuryConsumption.aggregate({
          _sum: { usdtMinor: true, basisEgpMinor: true },
        })
        const usdtMinor = agg._sum.usdtMinor ?? 0
        const basisEgpMinor = agg._sum.basisEgpMinor ?? 0
        assertNonNegativeSafeInteger(usdtMinor)
        assertNonNegativeSafeInteger(basisEgpMinor)
        return { usdtMinor, basisEgpMinor }
      },
      sumUsdtSince: async (since: string) => {
        const agg = await db.treasuryConsumption.aggregate({
          _sum: { usdtMinor: true },
          where: { createdAt: { gte: new Date(since) } },
        })
        const sum = agg._sum.usdtMinor
        if (sum === null || sum === undefined) {
          return 0
        }
        assertNonNegativeSafeInteger(sum)
        return sum
      },
      listRecent: async (limit: number) => {
        const rows = await db.treasuryConsumption.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        return rows.map((row) =>
          treasuryConsumption({
            id: row.id,
            orderId: row.orderId,
            usdtMinor: row.usdtMinor,
            basisEgpMinor: row.basisEgpMinor,
            wacEgpMinor: row.wacEgpMinor,
            createdAt: row.createdAt.toISOString(),
          }),
        )
      },
    },
    reconciliations: {
      append: async (record: ReconciliationRecord) => {
        await db.reconciliation.create({
          data: {
            id: record.id,
            expectedUsdtMinor: record.expectedUsdtMinor,
            supplierUsdtMinor: record.supplierUsdtMinor,
            gapUsdtMinor: record.gapUsdtMinor,
            status: record.status,
            createdAt: new Date(record.createdAt),
          },
        })
      },
      latest: async () => {
        const row = await db.reconciliation.findFirst({ orderBy: { createdAt: "desc" } })
        if (row === null) {
          return null
        }
        return Object.freeze({
          id: row.id,
          expectedUsdtMinor: row.expectedUsdtMinor,
          supplierUsdtMinor: row.supplierUsdtMinor,
          gapUsdtMinor: row.gapUsdtMinor,
          status: row.status as any,
          createdAt: row.createdAt.toISOString(),
        }) as ReconciliationRecord
      },
    },
  }
}
