/**
 * Prisma adapters for `FundingRepository`, `ConsumptionRepository`, and
 * `ReconciliationRepository`, persisting treasury records.
 */
import { Prisma, PrismaClient } from "@prisma/client"
import type { TreasuryRepositories } from "@/treasury"
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

type PrismaMinor = bigint | number

function toMinor(value: PrismaMinor): number {
  const n = typeof value === "bigint" ? Number(value) : value
  if (!Number.isSafeInteger(n)) {
    throw new RangeError()
  }
  return n
}

function toMinorOrZero(value: PrismaMinor | null | undefined): number {
  return value === null || value === undefined ? 0 : toMinor(value)
}

function toFunding(row: {
  id: string
  egpPaidMinor: PrismaMinor
  usdtMilli: PrismaMinor
  createdAt: Date
}): Funding {
  return funding({
    id: row.id,
    egpPaidMinor: toMinor(row.egpPaidMinor),
    usdtMilli: toMinor(row.usdtMilli),
    createdAt: row.createdAt.toISOString(),
  })
}

export function createPrismaTreasuryRepositories(db: PrismaClient | Prisma.TransactionClient): TreasuryRepositories {
  return {
    fundings: {
      append: async (lot) => {
        await db.funding.create({
          data: {
            id: lot.id,
            egpPaidMinor: BigInt(lot.egpPaidMinor),
            usdtMilli: BigInt(lot.usdtMilli),
            createdAt: new Date(lot.createdAt),
          },
        })
      },
      totals: async () => {
        const agg = await db.funding.aggregate({
          _sum: { usdtMilli: true, egpPaidMinor: true },
        })
        const usdtMilli = toMinorOrZero(agg._sum.usdtMilli)
        const basisEgpMinor = toMinorOrZero(agg._sum.egpPaidMinor)
        assertNonNegativeSafeInteger(usdtMilli)
        assertNonNegativeSafeInteger(basisEgpMinor)
        return { usdtMilli, basisEgpMinor }
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
            usdtMilli: BigInt(consumption.usdtMilli),
            basisEgpMinor: BigInt(consumption.basisEgpMinor),
            wacEgpMinor: BigInt(consumption.wacEgpMinor),
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
          usdtMilli: toMinor(row.usdtMilli),
          basisEgpMinor: toMinor(row.basisEgpMinor),
          wacEgpMinor: toMinor(row.wacEgpMinor),
          createdAt: row.createdAt.toISOString(),
        })
      },
      totals: async () => {
        const agg = await db.treasuryConsumption.aggregate({
          _sum: { usdtMilli: true, basisEgpMinor: true },
        })
        const usdtMilli = toMinorOrZero(agg._sum.usdtMilli)
        const basisEgpMinor = toMinorOrZero(agg._sum.basisEgpMinor)
        assertNonNegativeSafeInteger(usdtMilli)
        assertNonNegativeSafeInteger(basisEgpMinor)
        return { usdtMilli, basisEgpMinor }
      },
      sumUsdtSince: async (since: string) => {
        const agg = await db.treasuryConsumption.aggregate({
          _sum: { usdtMilli: true },
          where: { createdAt: { gte: new Date(since) } },
        })
        const sum = agg._sum.usdtMilli
        if (sum === null || sum === undefined) {
          return 0
        }
        const value = toMinor(sum)
        assertNonNegativeSafeInteger(value)
        return value
      },
      listRecent: async (limit: number) => {
        const rows = await db.treasuryConsumption.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        return rows.map((row) =>
          treasuryConsumption({
            id: row.id,
            orderId: row.orderId,
            usdtMilli: toMinor(row.usdtMilli),
            basisEgpMinor: toMinor(row.basisEgpMinor),
            wacEgpMinor: toMinor(row.wacEgpMinor),
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
            expectedUsdtMilli: BigInt(record.expectedUsdtMilli),
            supplierUsdtMilli: BigInt(record.supplierUsdtMilli),
            gapUsdtMilli: BigInt(record.gapUsdtMilli),
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
          expectedUsdtMilli: toMinor(row.expectedUsdtMilli),
          supplierUsdtMilli: toMinor(row.supplierUsdtMilli),
          gapUsdtMilli: toMinor(row.gapUsdtMilli),
          status: row.status as any,
          createdAt: row.createdAt.toISOString(),
        }) as ReconciliationRecord
      },
    },
  }
}

export function createPrismaTreasuryUnitOfWork(db: PrismaClient): {
  runInTransaction: <T>(fn: (repos: TreasuryRepositories) => Promise<T>) => Promise<T>
} {
  return {
    runInTransaction: (fn) =>
      db.$transaction(async (tx) => {
        // Serialize treasury mutations: lock every funding row for the
        // duration of the transaction. Consumptions all read the funding
        // totals, so they queue here instead of both passing the guard.
        await tx.$queryRawUnsafe("SELECT id FROM `Funding` FOR UPDATE")
        return fn(createPrismaTreasuryRepositories(tx))
      }),
  }
}
