/**
 * Prisma adapter for `TreasuryReportRepository`: daily P2P/WAC series and the
 * treasury summary. The WAC series merges funding and consumption per day into
 * a cumulative curve.
 */
import type { PrismaClient } from "@prisma/client"
import { DailySeriesPoint } from "@/treasury"
import { ClientSummarySince, OrderSummarySince, TreasuryReportRepository, WacSeriesPoint } from "@/treasury"
import { wacEgpMinor } from "@/treasury"

function toUtcDayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isValidISODateString(s: string): boolean {
  if (typeof s !== "string") {
    return false
  }
  const trimmed = s.trim()
  if (trimmed.length === 0) {
    return false
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) {
    return false
  }
  return true
}

export function createPrismaTreasuryReportRepository(db: PrismaClient): TreasuryReportRepository {
  // Determine Order table name from prisma/schema.prisma (model Order, no @@map) and migrations (CREATE TABLE `Order`) -> table name is `Order`
  const orderTableName = "Order"

  return {
    summarySince: async (since: string): Promise<OrderSummarySince> => {
      const agg = await db.order.aggregate({
        _count: true,
        _sum: { priceMinor: true, discountMinor: true, tradingMarginMinor: true },
        where: { status: "DELIVERED", createdAt: { gte: new Date(since) } },
      })
      const deliveredCount = typeof agg._count === "number" ? agg._count : Number(agg._count ?? 0)
      const priceSum = agg._sum.priceMinor ?? 0
      const discountSum = agg._sum.discountMinor ?? 0
      const marginSum = agg._sum.tradingMarginMinor ?? 0
      const revenueUsdMinor = (Number(priceSum) ?? 0) - (Number(discountSum) ?? 0)
      const marginUsdMinor = Number(marginSum) ?? 0
      if (!Number.isSafeInteger(deliveredCount) || deliveredCount < 0 || !Number.isSafeInteger(revenueUsdMinor) || revenueUsdMinor < 0 || !Number.isSafeInteger(marginUsdMinor) || marginUsdMinor < 0) {
        throw new RangeError()
      }
      return { deliveredCount, revenueUsdMinor, marginUsdMinor }
    },
    dailySeriesSince: async (since: string): Promise<readonly DailySeriesPoint[]> => {
      try {
        const query = `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COUNT(*) AS ordersCount, COALESCE(SUM(priceMinor - COALESCE(discountMinor, 0)), 0) AS revenueUsdMinor, COALESCE(SUM(COALESCE(tradingMarginMinor, 0)), 0) AS marginUsdMinor, COALESCE(SUM(COALESCE(coinsConsumed, 0)), 0) AS coinsSold FROM \`${orderTableName}\` WHERE status = 'DELIVERED' AND createdAt >= ? GROUP BY day ORDER BY day`
        const rows = await db.$queryRawUnsafe(query, new Date(since)) as Array<any>
        const result: DailySeriesPoint[] = []
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const day = String(r.day)
          const ordersCount = Number(r.ordersCount)
          const revenueUsdMinor = Number(r.revenueUsdMinor)
          const marginUsdMinor = Number(r.marginUsdMinor)
          const coinsSold = Number(r.coinsSold)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            throw new RangeError()
          }
          if (!Number.isSafeInteger(ordersCount) || ordersCount < 0 || !Number.isSafeInteger(revenueUsdMinor) || revenueUsdMinor < 0 || !Number.isSafeInteger(marginUsdMinor) || marginUsdMinor < 0 || !Number.isSafeInteger(coinsSold) || coinsSold < 0) {
            throw new RangeError()
          }
          result.push(Object.freeze({ day, ordersCount, revenueUsdMinor, marginUsdMinor, coinsSold }))
        }
        return result
      } catch (e) {
        throw e
      }
    },
    clientSummarySince: async (since: string): Promise<readonly ClientSummarySince[]> => {
      try {
        const query = `SELECT clientId, COALESCE(SUM(COALESCE(coinsConsumed, 0)), 0) AS coinsConsumed, COALESCE(SUM(COALESCE(tradingMarginMinor, 0)), 0) AS marginUsdMinor FROM \`${orderTableName}\` WHERE status = 'DELIVERED' AND createdAt >= ? GROUP BY clientId`
        const rows = await db.$queryRawUnsafe(query, new Date(since)) as Array<any>
        const result: Array<{ clientId: string; coinsConsumed: number; marginUsdMinor: number }> = []
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const clientId = String(r.clientId)
          const coinsConsumed = Number(r.coinsConsumed)
          const marginUsdMinor = Number(r.marginUsdMinor)
          if (!Number.isSafeInteger(coinsConsumed) || coinsConsumed < 0 || !Number.isSafeInteger(marginUsdMinor) || marginUsdMinor < 0) {
            throw new RangeError()
          }
          result.push(Object.freeze({ clientId, coinsConsumed, marginUsdMinor }))
        }
        return result
      } catch (e) {
        throw e
      }
    },
    wacSeriesSince: async (since: string): Promise<readonly WacSeriesPoint[]> => {
      if (!isValidISODateString(since)) {
        throw new RangeError()
      }
      const sinceDate = new Date(since.trim())
      const sinceDay = toUtcDayString(sinceDate)

      const fundingQuery = `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COALESCE(SUM(usdtMilli), 0) AS usdtMilli, COALESCE(SUM(egpPaidMinor), 0) AS basisEgpMinor FROM \`Funding\` GROUP BY day ORDER BY day`
      const consumptionQuery = `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COALESCE(SUM(usdtMilli), 0) AS usdtMilli, COALESCE(SUM(basisEgpMinor), 0) AS basisEgpMinor FROM \`TreasuryConsumption\` GROUP BY day ORDER BY day`

      const fundingRows = (await db.$queryRawUnsafe(fundingQuery)) as Array<any>
      const consumptionRows = (await db.$queryRawUnsafe(consumptionQuery)) as Array<any>

      const fundingByDay = new Map<string, { usdtMilli: number; basisEgpMinor: number }>()
      for (let i = 0; i < fundingRows.length; i++) {
        const r = fundingRows[i]
        const day = String(r.day)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          throw new RangeError()
        }
        const usdtMilli = Number(r.usdtMilli)
        const basisEgpMinor = Number(r.basisEgpMinor)
        if (!Number.isSafeInteger(usdtMilli) || usdtMilli < 0 || !Number.isSafeInteger(basisEgpMinor) || basisEgpMinor < 0) {
          throw new RangeError()
        }
        fundingByDay.set(day, { usdtMilli, basisEgpMinor })
      }

      const consumptionByDay = new Map<string, { usdtMilli: number; basisEgpMinor: number }>()
      for (let i = 0; i < consumptionRows.length; i++) {
        const r = consumptionRows[i]
        const day = String(r.day)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          throw new RangeError()
        }
        const usdtMilli = Number(r.usdtMilli)
        const basisEgpMinor = Number(r.basisEgpMinor)
        if (!Number.isSafeInteger(usdtMilli) || usdtMilli < 0 || !Number.isSafeInteger(basisEgpMinor) || basisEgpMinor < 0) {
          throw new RangeError()
        }
        consumptionByDay.set(day, { usdtMilli, basisEgpMinor })
      }

      const allDaysSet = new Set<string>()
      for (const d of fundingByDay.keys()) allDaysSet.add(d)
      for (const d of consumptionByDay.keys()) allDaysSet.add(d)
      const allDays = Array.from(allDaysSet).sort()

      let accFundingUsdt = 0
      let accFundingBasis = 0
      let accConsumedUsdt = 0
      const result: WacSeriesPoint[] = []
      for (let i = 0; i < allDays.length; i++) {
        const day = allDays[i]
        const f = fundingByDay.get(day)
        const c = consumptionByDay.get(day)
        if (f) {
          accFundingUsdt = accFundingUsdt + f.usdtMilli
          accFundingBasis = accFundingBasis + f.basisEgpMinor
        }
        if (c) {
          accConsumedUsdt = accConsumedUsdt + c.usdtMilli
        }
        const remainingUsdt = accFundingUsdt - accConsumedUsdt
        if (
          !Number.isSafeInteger(accFundingUsdt) ||
          !Number.isSafeInteger(accFundingBasis) ||
          !Number.isSafeInteger(accConsumedUsdt) ||
          remainingUsdt < 0
        ) {
          throw new RangeError()
        }
        if (day < sinceDay) {
          continue
        }
        // WAC is funding-derived: a consumption-only day cannot move it.
        const wac =
          remainingUsdt === 0
            ? 0
            : wacEgpMinor({ usdtMilli: accFundingUsdt, basisEgpMinor: accFundingBasis })
        result.push(Object.freeze({ day, wacEgpMinor: wac }))
      }
      return result
    },
  }
}
