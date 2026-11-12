/**
 * Prisma adapter for `OrderRepository`: persists and queries order aggregates
 * with related client/product data, summing delivered coins since a cutoff.
 */
import type { PrismaClient } from "@prisma/client"
import { OrderRepository } from "@/ordering"
import { Order, order } from "@/ordering"
import { OrderStatus } from "@/ordering"
import { client } from "@/accounts"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { money, CurrencyCode } from "../../shared/money"

function assertNonNegativeSafeInteger(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError()
  }
}

export function createPrismaOrderRepository(db: PrismaClient): OrderRepository {
  const toOrder = (row: any): Order => {
    const clientAccount = row.client?.account
      ? { id: row.client.account.id, username: row.client.account.username, email: row.client.account.email }
      : null
    const created = order({
      id: row.id,
      token: row.token,
      profileId: row.profileId,
      client: client(row.client.id),
      clientAccount,
      product: product({
        id: row.product.id,
        distributorId: row.product.distributorId,
        name: row.product.name,
        cost: money(row.product.costMinor, row.product.currency as CurrencyCode),
        game: row.product.game,
      }),
      player: player(row.userId, row.serverId),
      price: money(row.priceMinor, row.currency as CurrencyCode),
      markupBasisPoints: row.markupBasisPoints ?? null,
      coinValueMinor: row.coinValueMinor ?? null,
      termsVersion: row.termsVersion ?? null,
      termsAcceptedAt:
        row.termsAcceptedAt === null || row.termsAcceptedAt === undefined
          ? null
          : new Date(row.termsAcceptedAt).toISOString(),
    })
    return Object.freeze({
      id: created.id,
      token: created.token,
      profileId: row.profileId,
      client: created.client,
      clientAccount: created.clientAccount ?? null,
      product: created.product,
      player: created.player,
      price: created.price,
      status: row.status as OrderStatus,
      paymentReference: row.paymentReference,
      distributorOrderId: row.distributorOrderId,
      createdAt: row.createdAt,
      discountMinor: row.discountMinor,
      costMinor: row.costMinor,
      costUsdtMilli: row.costUsdtMilli == null ? null : Number(row.costUsdtMilli),
      promoCodeId: row.promoCodeId,
      playerName: row.playerName,
      wacEgpMinor: row.wacEgpMinor,
      cogsEgpMinor: row.cogsEgpMinor,
      tradingMarginMinor: row.tradingMarginMinor,
      coinsCharged: row.coinsCharged,
      coinValueMinor: row.coinValueMinor ?? null,
      coinsConsumed: row.coinsConsumed,
      markupBasisPoints: row.markupBasisPoints ?? null,
      refundedAt: row.refundedAt === null || row.refundedAt === undefined ? null : new Date(row.refundedAt).toISOString(),
      termsVersion: row.termsVersion ?? null,
      termsAcceptedAt:
        row.termsAcceptedAt === null || row.termsAcceptedAt === undefined
          ? null
          : new Date(row.termsAcceptedAt).toISOString(),
    })
  }


  return {
    save: async (o: Order) => {
      await db.order.create({
          data: {
            id: o.id,
            token: o.token,
            profileId: o.profileId,
            clientId: o.client.id,
            productId: o.product.id,
            userId: o.player.userId,
            serverId: o.player.serverId,
            priceMinor: o.price.minor,
            currency: o.price.currency,
            status: o.status as never,
            paymentReference: o.paymentReference,
            distributorOrderId: o.distributorOrderId,
            costMinor: o.costMinor ?? null,
            costUsdtMilli: o.costUsdtMilli == null ? null : BigInt(o.costUsdtMilli),
            discountMinor: o.discountMinor ?? 0,
            promoCodeId: o.promoCodeId ?? null,
            playerName: o.playerName ?? null,
            wacEgpMinor: o.wacEgpMinor ?? null,
            cogsEgpMinor: o.cogsEgpMinor ?? null,
            tradingMarginMinor: o.tradingMarginMinor ?? null,
            coinsCharged: o.coinsCharged ?? null,
            coinValueMinor: o.coinValueMinor ?? null,
            coinsConsumed: o.coinsConsumed ?? null,
            markupBasisPoints: o.markupBasisPoints ?? null,
            refundedAt: o.refundedAt === null ? null : new Date(o.refundedAt),
            termsVersion: o.termsVersion ?? null,
            termsAcceptedAt: o.termsAcceptedAt === null ? null : new Date(o.termsAcceptedAt),
          },
      })
    },
    update: async (o: Order) => {
      await db.order.update({
        where: { id: o.id },
          data: {
            status: o.status as never,
            paymentReference: o.paymentReference,
            distributorOrderId: o.distributorOrderId,
            priceMinor: o.price.minor,
            currency: o.price.currency,
            costMinor: o.costMinor ?? null,
            costUsdtMilli: o.costUsdtMilli == null ? null : BigInt(o.costUsdtMilli),
            discountMinor: o.discountMinor ?? 0,
            promoCodeId: o.promoCodeId ?? null,
            playerName: o.playerName ?? null,
            wacEgpMinor: o.wacEgpMinor ?? null,
            cogsEgpMinor: o.cogsEgpMinor ?? null,
            tradingMarginMinor: o.tradingMarginMinor ?? null,
            coinsCharged: o.coinsCharged ?? null,
            coinValueMinor: o.coinValueMinor ?? null,
            coinsConsumed: o.coinsConsumed ?? null,
            markupBasisPoints: o.markupBasisPoints ?? null,
            refundedAt: o.refundedAt === null ? null : new Date(o.refundedAt),
            termsVersion: o.termsVersion ?? null,
            termsAcceptedAt: o.termsAcceptedAt === null ? null : new Date(o.termsAcceptedAt),
          },
      })
    },
    findById: async (id: string) => {
      const row = await db.order.findUnique({
        where: { id },
        include: { client: true, product: true },
      })
      if (row === null) {
        return null
      }
      return toOrder(row)
    },
    findByToken: async (token: string) => {
      const row = await db.order.findUnique({
        where: { token },
        include: { client: true, product: true },
      })
      if (row === null) {
        return null
      }
      return toOrder(row)
    },
    listRecent: async (limit: number) => {
      const rows = await db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { client: true, product: true },
      })
      return rows.map((row) => toOrder(row))
    },
    listByClient: async (clientId: string, limit: number) => {
      const rows = await db.order.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { client: { include: { account: true } }, product: true },
      })
      return rows.map((row) => toOrder(row))
    },
    countByClient: async (clientId: string, since: string | null) => {
      // Achievement progress must reflect actual purchases, not abandoned or
      // refunded checkouts, so only paid/fulfilling/delivered orders count.
      return db.order.count({
        where: {
          clientId,
          status: { in: ["PAID", "FULFILLING", "DELIVERED"] },
          ...(since === null ? {} : { createdAt: { gte: new Date(since) } }),
        },
      })
    },
    findByDistributorOrderId: async (distributorOrderId: string) => {
      const row = await db.order.findFirst({
        where: { distributorOrderId },
        include: { client: true, product: true },
      })
      if (row === null) {
        return null
      }
      return toOrder(row)
    },
    listByStatus: async (status: OrderStatus, limit: number, skip = 0) => {
      const rows = await db.order.findMany({ where: { status: status as never }, orderBy: { createdAt: "asc" }, take: limit, skip, include: { client: true, product: true } })
      return rows.map((row) => toOrder(row))
    },
    listFailedUnrefundedCoinOrders: async (limit: number) => {
      const rows = await db.order.findMany({
        where: {
          status: "FAILED" as never,
          refundedAt: null,
          coinsCharged: { not: null, gt: 0 },
        },
        orderBy: { createdAt: "asc" },
        take: limit,
        include: { client: true, product: true },
      })
      return rows.map((row) => toOrder(row))
    },
    search: async (input) => {
      const where: any = {}
      if (input.status !== null) {
        where.status = input.status as never
      }
      if (input.from || input.to) {
        where.createdAt = {}
        if (input.from) {
          where.createdAt.gte = new Date(input.from)
        }
        if (input.to) {
          const to = new Date(input.to)
          to.setHours(23, 59, 59, 999)
          where.createdAt.lte = to
        }
      }
      if (input.q && input.q.trim() !== "") {
        const q = input.q.trim()
        where.OR = [
          { token: { contains: q } },
          { userId: { contains: q } },
          { serverId: { contains: q } },
        ]
      }
      const [rows, total] = await Promise.all([
        db.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: input.skip,
          take: input.take,
          include: { client: { include: { account: true } }, product: true },
        }),
        db.order.count({ where }),
      ])
      return { rows: rows.map((row) => toOrder(row)), total }
    },
      sumCoinsChargedSince: async (since: string) => {
        const agg = await db.order.aggregate({
          _sum: { coinsCharged: true },
          where: { status: "DELIVERED", createdAt: { gte: new Date(since) } },
        })
        const sum = agg._sum.coinsCharged
        if (sum === null || sum === undefined) {
          return 0
        }
        assertNonNegativeSafeInteger(sum)
        return sum
      },
      summarizeByClient: async (clientId: string, monthStart: string) => {
        const [totalOrders, totalAgg, monthlyAgg] = await Promise.all([
          db.order.count({ where: { clientId } }),
          db.order.aggregate({
            _sum: { coinsCharged: true },
            where: { clientId, status: { in: ["PAID", "FULFILLING", "DELIVERED"] } },
          }),
          db.order.aggregate({
            _sum: { coinsCharged: true },
            where: { clientId, status: { in: ["PAID", "FULFILLING", "DELIVERED"] }, createdAt: { gte: new Date(monthStart) } },
          }),
        ])
        const totalSum = totalAgg._sum.coinsCharged
        const monthlySum = monthlyAgg._sum.coinsCharged
        const totalPaidCoins = totalSum === null || totalSum === undefined ? 0 : totalSum
        const monthlyPaidCoins = monthlySum === null || monthlySum === undefined ? 0 : monthlySum
        assertNonNegativeSafeInteger(totalPaidCoins)
        assertNonNegativeSafeInteger(monthlyPaidCoins)
        return { totalOrders, totalPaidCoins, monthlyPaidCoins }
      },

   }
}

