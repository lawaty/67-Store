/**
 * Serves backoffice admin operations: dashboards, order/product/user queries,
 * settings, promos, and treasury or wallet adjustments mapped to DTOs.
 */

import { Prisma } from "@prisma/client"
import type { Container } from "@/container"
import type { Order } from "@/ordering"
import type { OrderStatus } from "@/ordering"
import { productAvailability, type Product } from '@/catalogue'
import { DEFAULT_EGP_RATE, EGP_RATE_KEY, readEgpRate, toEgp } from "@/treasury"
import {
  DEFAULT_MARKUP_BASIS_POINTS,
  markupBaseKey,
  markupOverrideKey,
  nextBreakpoint,
  readBaseMarkup,
  readQualifyingVolume,
  readMarkupOverride,
  readVipMarkupCurve,
  resolveClientMarkup,
  resolveMarkupBasisPoints,
} from "@/ordering"
import { readVipLevels, saveVipLevels as persistVipLevels } from "@/ordering"
import { validateLevels, type Level } from "@/ordering"
import { coinIndexCapped, coinIndexLastMoveBps, coinsForUsdtMinor, readCoinIndex, readCoinValueMinor, reservedUsdtMinor, writeCoinIndexCap } from "@/treasury"
import { readDepositRate } from "@/treasury"
import { assertPositiveCoins } from "@/wallet"

import { availableUsdtMinor, coverageBasisPoints, freeUsdtMinor } from "@/treasury"
import { fxResultEgpMinor } from "@/treasury"
import { fillDailySeries } from "@/treasury"
import { appendP2pHistory, p2pHourKey, readP2pHistory, readP2pLatestRate, readP2pSettings, readP2pWindowRange, writeP2pSettings, MAX_P2P_OUTLIER_SIGMA, MAX_P2P_SYNC_INTERVAL_SECONDS, MAX_P2P_WINDOW_HOURS, MIN_P2P_OUTLIER_SIGMA, MIN_P2P_SYNC_INTERVAL_SECONDS, MIN_P2P_WINDOW_HOURS } from "@/treasury"
import { normalizeCode, type PromoKind } from "@/promos"
import { money, type CurrencyCode } from "@/shared/money"
import { P2P_RATE_MANUAL_KEY, readP2pManualOverride } from "@/treasury"

export { readEgpRate } from "@/treasury"
import { isStorefrontMethod, readStorefrontDefaultMethod, writeStorefrontDefaultMethod } from "@/catalogue"
import type {
  AdminDashboardDto,
  AdminLevelDto,
  AdminOrderPageDto,
  AdminOrderRowDto,
  AdminProductDto,
  AdminPromoDto,
  AdminSettingsDto,
  AdminStatsDto,
  AdminUserDetailDto,
  AdminUserPageDto,
  TreasuryDashboardDto,
  WalletOutcomeDto,
} from "./contracts"

export type AdminResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

export type OrderQuery = {
  readonly status: OrderStatus | null
  readonly from: string | null
  readonly to: string | null
  readonly q: string | null
  readonly skip: number
  readonly take: number
}

export function presentAdminOrder(order: Order): AdminOrderRowDto {
  return {
    id: order.id,
    token: order.token,
    clientId: order.client?.id ?? null,
    productName: order.product.name,
    player: { userId: order.player.userId, serverId: order.player.serverId },
    price: order.price,
    discountMinor: order.discountMinor ?? null,
    costMinor: order.costMinor ?? null,
    status: order.status,
    createdAt:
      order.createdAt === null || order.createdAt === undefined
        ? null
        : order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : String(order.createdAt),
  }
}

export function presentAdminProduct(
  product: Product,
  availableUsdtMinorValue: number | null,
): AdminProductDto {
  const active = product.active !== false
  const availability = productAvailability({
    active,
    costMinor: product.cost.minor,
    availableUsdtMinor: availableUsdtMinorValue,
  })
  return {
    id: product.id,
    name: product.name,
    cost: product.cost,
    active,
    syncedAt: product.syncedAt ? product.syncedAt.toISOString() : null,
    buyable: availability.buyable,
    fundingGapMinor: availability.fundingGapMinor,
    unavailableReason: availability.unavailableReason,
  }
}

export async function readAdminStats(c: Container): Promise<AdminStatsDto> {
  let balanceUsdtMinor: number | null = null
  let balanceError = false
  try {
    const balance = await c.distributor.getBalance()
    balanceUsdtMinor = balance.balanceMinor
  } catch {
    balanceUsdtMinor = null
    balanceError = true
  }

  let p2pEgpPerUsdtMinor: number | null = null
  try {
    const latest = await readP2pLatestRate(c.settings, new Date().toISOString())
    if (latest !== null) {
      p2pEgpPerUsdtMinor = latest.egpPerUsdtMinor
    } else {
      const rate = await c.p2pRate.read()
      p2pEgpPerUsdtMinor = rate?.egpPerUsdtMinor ?? null
    }
  } catch {
    p2pEgpPerUsdtMinor = null
  }

  let wacEgpMinor: number | null = null
  let recordedUsdtMinor: number | null = null
  let reservedUsdtMinorValue: number | null = null
  let availableUsdtMinorValue: number | null = null
  try {
    const snapshot = await c.treasury.snapshot()
    wacEgpMinor = snapshot.wacEgpMinor
    const recorded = snapshot.usdtMinor
    const reserved = reservedUsdtMinor(
      await c.coinSupply.totalCoins(),
      await readCoinValueMinor(c.settings),
    )
    recordedUsdtMinor = recorded
    reservedUsdtMinorValue = reserved
    availableUsdtMinorValue = availableUsdtMinor(recorded, reserved)
  } catch {
    recordedUsdtMinor = null
    reservedUsdtMinorValue = null
    availableUsdtMinorValue = null
  }

  return {
    balanceUsdtMinor,
    p2pEgpPerUsdtMinor,
    wacEgpMinor,
    availableUsdtMinor: availableUsdtMinorValue,
    recordedUsdtMinor,
    reservedUsdtMinor: reservedUsdtMinorValue,
    balanceError,
    updatedAt: new Date().toISOString(),
  }
}

export async function readDashboard(c: Container): Promise<AdminDashboardDto> {
  const rate = await readEgpRate(c.settings)
  const activeProducts = await c.products.listActive("mlbb")

  let balance: AdminDashboardDto["balance"] = null
  let balanceAt: string | null = null
  let balanceError = false
  let liveUsdtMinor = 0
  try {
    const distributor = await c.distributor.getBalance()
    balance = {
      usdMinor: distributor.balanceMinor,
      egpMinor: toEgp(money(distributor.balanceMinor, "USD"), rate).minor,
    }
    balanceAt = new Date().toISOString()
    liveUsdtMinor = distributor.balanceMinor
  } catch {
    balanceError = true
    balanceAt = null
    liveUsdtMinor = 0
  }

  const usdMinor = balance === null ? null : balance.usdMinor
  const cheapest =
    activeProducts.length > 0
      ? activeProducts.reduce(
          (min, product) => (product.cost.minor < min ? product.cost.minor : min),
          activeProducts[0].cost.minor,
        )
      : null

  const unfulfillableCount =
    usdMinor === null ? 0 : activeProducts.filter((product) => product.cost.minor > usdMinor).length
  const showWarning = usdMinor !== null && (usdMinor <= 0 || (cheapest !== null && usdMinor < cheapest))

  const [snapshot, coinsOutstanding, coinIndex, averageCoinFundingCostEgpMinor, p2pSettingsState] = await Promise.all([
    c.treasury.snapshot(),
    c.coinSupply.totalCoins(),
    readCoinIndex(c.settings),
    c.deposits.coinWacEgpMinor(),
    readP2pSettings(c.settings),
  ])

  const reservedMinor = reservedUsdtMinor(coinsOutstanding, coinIndex.coinValueMinor)
  const coverage = coverageBasisPoints(liveUsdtMinor, reservedMinor)
  const available = availableUsdtMinor(snapshot.usdtMinor, reservedMinor)
  const availableCoins =
    available > 0 ? coinsForUsdtMinor(available, coinIndex.coinValueMinor) : 0
  const now = Date.now()
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since90 = new Date(now - 89 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date(now).toISOString()
  const { windowHours } = p2pSettingsState
  let p2p: AdminDashboardDto["p2p"] = null
  try {
    const mapWindowRange = (windowRange: Awaited<ReturnType<typeof readP2pWindowRange>>): NonNullable<AdminDashboardDto["p2p"]>["range"] =>
      windowRange === null
        ? null
        : {
            minEgpPerUsdtMinor: windowRange.minEgpPerUsdtMinor,
            avgEgpPerUsdtMinor: windowRange.avgEgpPerUsdtMinor,
            maxEgpPerUsdtMinor: windowRange.maxEgpPerUsdtMinor,
            adCount: windowRange.adCount,
            stdDevEgpPerUsdtMinor: windowRange.stdDevEgpPerUsdtMinor ?? null,
            outlierCount: windowRange.outlierCount ?? 0,
          }

    const latest = await readP2pLatestRate(c.settings, nowIso)
    if (latest !== null) {
      const windowRange = await readP2pWindowRange(c.settings, windowHours, nowIso)
      p2p = {
        egpPerUsdtMinor: latest.egpPerUsdtMinor,
        source: "binance-p2p",
        fetchedAt: latest.fetchedAt,
        stale: latest.stale,
        bankTransferEgpPerUsdtMinor: null,
        vodafoneEgpPerUsdtMinor: null,
        range: mapWindowRange(windowRange),
      }
    } else {
      const p2pRate = await c.p2pRate.read()
      if (p2pRate !== null) {
        if (p2pRate.fetchedAt !== null && p2pRate.range !== null && p2pRate.range !== undefined) {
          try {
            const range = p2pRate.range as { minEgpPerUsdtMinor?: number; avgEgpPerUsdtMinor?: number; maxEgpPerUsdtMinor?: number; adCount?: number; priceSumMinor?: number; stdDevEgpPerUsdtMinor?: number; outlierCount?: number }
            await appendP2pHistory(
              c.settings,
              {
                day: p2pRate.fetchedAt.slice(0, 10),
                hour: p2pHourKey(p2pRate.fetchedAt) ?? undefined,
                egpPerUsdtMinor: p2pRate.egpPerUsdtMinor,
                minEgpPerUsdtMinor: range.minEgpPerUsdtMinor,
                avgEgpPerUsdtMinor: range.avgEgpPerUsdtMinor,
                maxEgpPerUsdtMinor: range.maxEgpPerUsdtMinor,
                offerCount: range.adCount,
                priceSumMinor: range.priceSumMinor,
                stdDevEgpPerUsdtMinor: range.stdDevEgpPerUsdtMinor,
                outlierCount: range.outlierCount,
                lastObservedAt: p2pRate.fetchedAt,
              },
              nowIso,
            )
          } catch {
            // best-effort persist must not fail the dashboard
          }
        }
        const windowRange = await readP2pWindowRange(c.settings, windowHours, nowIso)
        p2p = {
          egpPerUsdtMinor: p2pRate.egpPerUsdtMinor,
          source: p2pRate.source,
          fetchedAt: p2pRate.fetchedAt,
          stale: p2pRate.stale,
          bankTransferEgpPerUsdtMinor: p2pRate.bankTransferEgpPerUsdtMinor ?? null,
          vodafoneEgpPerUsdtMinor: p2pRate.vodafoneEgpPerUsdtMinor ?? null,
          range: mapWindowRange(windowRange),
        }
      } else {
        p2p = null
      }
    }
  } catch {
    p2p = null
  }

  const [s7, s30, depositsSince30, seriesPoints, p2pHistory, wacHistory, sumUsdt7, sumCoins7] =
    await Promise.all([
      c.orderReport.summarySince(since7),
      c.orderReport.summarySince(since30),
      c.deposits.listSince(since30),
      c.orderReport.dailySeriesSince(since90),
      readP2pHistory(c.settings),
      c.orderReport.wacSeriesSince(since90),
      c.consumptions.sumUsdtSince(since7),
      c.orders.sumCoinsChargedSince(since7),
    ])

  let sevenDaysEgpMinor = 0
  let thirtyDaysEgpMinor = 0
  for (let i = 0; i < depositsSince30.length; i++) {
    const d = depositsSince30[i]
    const fx = fxResultEgpMinor(d)
    thirtyDaysEgpMinor += fx
    if (d.createdAt >= since7) {
      sevenDaysEgpMinor += fx
    }
  }

  const series = fillDailySeries(since90, nowIso, seriesPoints)

  const [clientSummaries7, clientSummaries30, accountsPage] = await Promise.all([
    c.orderReport.clientSummarySince(since7),
    c.orderReport.clientSummarySince(since30),
    c.accounts.list({ skip: 0, take: 10000 }),
  ])

  const emailByClient = new Map<string, string>()
  for (let i = 0; i < accountsPage.rows.length; i++) {
    const row = accountsPage.rows[i]
    emailByClient.set(row.clientId, row.email)
  }

  const summary7ByClient = new Map<string, { coins: number; profit: number }>()
  for (let i = 0; i < clientSummaries7.length; i++) {
    const s = clientSummaries7[i] as any
    const id = String(s.clientId)
    const coins = Number(s.coinsConsumed ?? s.coins ?? 0)
    const profit = Number(s.marginUsdMinor ?? s.profitMinor ?? s.tradingMarginMinor ?? 0)
    summary7ByClient.set(id, { coins: Number.isFinite(coins) ? coins : 0, profit: Number.isFinite(profit) ? profit : 0 })
  }

  const summary30ByClient = new Map<string, { coins: number; profit: number }>()
  for (let i = 0; i < clientSummaries30.length; i++) {
    const s = clientSummaries30[i] as any
    const id = String(s.clientId)
    const coins = Number(s.coinsConsumed ?? s.coins ?? 0)
    const profit = Number(s.marginUsdMinor ?? s.profitMinor ?? s.tradingMarginMinor ?? 0)
    summary30ByClient.set(id, { coins: Number.isFinite(coins) ? coins : 0, profit: Number.isFinite(profit) ? profit : 0 })
  }

  const curve = await readVipMarkupCurve(c.settings, "mlbb")
  const base = await readBaseMarkup(c.settings, "mlbb")

  const clientProjections: Array<{
    clientId: string
    email: string | null
    coinsConsumed30d: number
    markupBasisPoints: number
    expectedMarkupBasisPoints7d: number
    expectedMarkupBasisPoints30d: number
    expectedProfit7Minor: number
    expectedProfit30Minor: number
  }> = []

  const nowDate = new Date(now)
  const clientIds = Array.from(summary30ByClient.keys())
  for (let i = 0; i < clientIds.length; i++) {
    const clientId = clientIds[i]
    const s30 = summary30ByClient.get(clientId)!
    const s7 = summary7ByClient.get(clientId)
    const c7 = s7 ? s7.coins : 0
    const p7 = s7 ? s7.profit : 0
    let c30 = s30.coins
    try {
      const rc = await readQualifyingVolume(c.activity, clientId, nowDate)
      if (Number.isFinite(rc) && rc !== 0) {
        c30 = rc
      }
    } catch {
      // keep repo value
    }
    if (!Number.isFinite(c30) || c30 < 0) c30 = 0

    const dailyCoins = c7 / 7
    const dailyProfit = p7 / 7
    const expectedCoins7 = Math.max(0, Math.round(c30 * 23 / 30 + dailyCoins * 7))
    const expectedCoins30 = Math.max(0, Math.round(dailyCoins * 30))

    const override = await readMarkupOverride(c.settings, clientId)

    let currentMarkup: number
    if (override !== null) {
      currentMarkup = override.basisPoints
    } else if (curve !== null) {
      currentMarkup = resolveMarkupBasisPoints(curve, c30)
    } else {
      currentMarkup = base.basisPoints
    }

    let expectedMarkup7d: number
    let expectedMarkup30d: number
    if (override !== null) {
      expectedMarkup7d = override.basisPoints
      expectedMarkup30d = override.basisPoints
    } else if (curve !== null) {
      expectedMarkup7d = resolveMarkupBasisPoints(curve, expectedCoins7)
      expectedMarkup30d = resolveMarkupBasisPoints(curve, expectedCoins30)
    } else {
      expectedMarkup7d = base.basisPoints
      expectedMarkup30d = base.basisPoints
    }

    const expectedProfit7Minor = Math.round(dailyProfit * 7)
    const expectedProfit30Minor = Math.round(dailyProfit * 30)

    const email = emailByClient.has(clientId) ? (emailByClient.get(clientId) ?? null) : null
    // treat empty string as null? keep as-is unless empty
    const emailValue = email === "" ? null : email

    clientProjections.push({
      clientId,
      email: emailValue,
      coinsConsumed30d: c30,
      markupBasisPoints: currentMarkup,
      expectedMarkupBasisPoints7d: expectedMarkup7d,
      expectedMarkupBasisPoints30d: expectedMarkup30d,
      expectedProfit7Minor,
      expectedProfit30Minor,
    })
  }

  clientProjections.sort((a, b) => b.expectedProfit7Minor - a.expectedProfit7Minor)
  if (clientProjections.length > 50) {
    clientProjections.length = 50
  }

  const avgDailyConsumption = sumUsdt7 / 7
  const treasuryRunwayDays =
    avgDailyConsumption > 0 ? Math.max(0, Math.floor(available / avgDailyConsumption)) : null
  const avgDailyCoins = sumCoins7 / 7
  const coinRunwayDays = avgDailyCoins > 0 ? Math.max(0, Math.floor(availableCoins / avgDailyCoins)) : null
  const availableUsdtEgpMinor =
    balanceError || p2p === null || available <= 0
      ? null
      : Math.floor((available * p2p.egpPerUsdtMinor) / 100)

  const recordedUsdtMinor = snapshot.usdtMinor
  const freeUsdtMinorValue = freeUsdtMinor(balanceError ? null : liveUsdtMinor, recordedUsdtMinor)

  return {
    balance,
    balanceAt,
    balanceError,
    unfulfillableCount,
    showWarning,
    operations: { mode: await c.operationsMode(), liveReady: c.liveReady },
    treasury: {
      expectedUsdtMinor: snapshot.usdtMinor,
      recordedUsdtMinor,
      freeUsdtMinor: freeUsdtMinorValue,
      wacEgpMinor: snapshot.wacEgpMinor,
      basisEgpMinor: snapshot.basisEgpMinor,
      breakEvenEgpMinor: snapshot.wacEgpMinor,
      coinsOutstanding,
      reservedUsdtMinor: reservedMinor,
      availableUsdtMinor: available,
      coverageBasisPoints: coverage,
      availableCoins,
      averageCoinFundingCostEgpMinor,
      coinIndex: coinIndex.indexMicro / 1_000_000,
      coinValueUsdMinor: coinIndex.coinValueMinor,
      coinIndexUpdatedAt: coinIndex.updatedAt,
      coinIndexCapBps: coinIndex.capBps,
      coinIndexLastMoveBps: coinIndexLastMoveBps(coinIndex),
      coinIndexCapped: coinIndexCapped(coinIndex),
    },
    history: {
      p2p: p2pHistory.map((point) => ({
        day: point.day,
        hour: point.hour ?? null,
        egpPerUsdtMinor: point.egpPerUsdtMinor,
        ...(point.minEgpPerUsdtMinor !== undefined ? { minEgpPerUsdtMinor: point.minEgpPerUsdtMinor } : {}),
        ...(point.avgEgpPerUsdtMinor !== undefined ? { avgEgpPerUsdtMinor: point.avgEgpPerUsdtMinor } : {}),
        ...(point.maxEgpPerUsdtMinor !== undefined ? { maxEgpPerUsdtMinor: point.maxEgpPerUsdtMinor } : {}),
      })),
      wac: wacHistory,
    },
    projections: {
      treasuryRunwayDays,
      coinRunwayDays,
      availableUsdtEgpMinor,
    },
    p2p,
    p2pSettings: p2pSettingsState,
    clientProjections,
    pricing: {
      baseMarkupBasisPoints: base.basisPoints,
      vipCurve: curve === null ? [] : curve.map((bp) => ({ coins: bp.coins, basisPoints: bp.basisPoints })),
    },
    summary: {
      tradingMargin: { sevenDaysMinor: s7.marginUsdMinor, thirtyDaysMinor: s30.marginUsdMinor },
      fxResult: { sevenDaysEgpMinor, thirtyDaysEgpMinor },
      delivered: { sevenDays: s7.deliveredCount, thirtyDays: s30.deliveredCount },
      revenue: { sevenDaysMinor: s7.revenueUsdMinor, thirtyDaysMinor: s30.revenueUsdMinor },
      series,
    },
  }
}

export async function searchOrders(c: Container, query: OrderQuery): Promise<AdminOrderPageDto> {
  const { rows, total } = await c.orders.search(query)
  return { rows: rows.map(presentAdminOrder), total, skip: query.skip }
}

export async function listProducts(c: Container): Promise<{ readonly products: readonly AdminProductDto[] }> {
  const [products, availableUsdtMinorValue] = await Promise.all([
    c.products.listAll("mlbb"),
    (async (): Promise<number | null> => {
      try {
        const snapshot = await c.treasury.snapshot()
        const [coins, coinValueMinor] = await Promise.all([
          c.coinSupply.totalCoins(),
          readCoinValueMinor(c.settings),
        ])
        return availableUsdtMinor(snapshot.usdtMinor, reservedUsdtMinor(coins, coinValueMinor))
      } catch {
        return null
      }
    })(),
  ])
  return { products: products.map((p) => presentAdminProduct(p, availableUsdtMinorValue)) }
}



export type PromoInput = {
  readonly code: string
  readonly kind: string
  readonly value: number
  readonly maxUses: string
  readonly expiresAt: string
}

export async function createPromo(c: Container, input: PromoInput, newId: () => string): Promise<AdminResult> {
  let code: string
  try {
    code = normalizeCode(input.code)
  } catch {
    return { ok: false, error: "code" }
  }

  if (input.kind !== "PERCENT" && input.kind !== "FIXED") {
    return { ok: false, error: "kind" }
  }
  const kind = input.kind as PromoKind

  if (!Number.isFinite(input.value)) {
    return { ok: false, error: "amount" }
  }

  let basisPoints: number | null = null
  let amountMinor: number | null = null
  if (kind === "PERCENT") {
    if (input.value < 1 || input.value > 100) {
      return { ok: false, error: "percent" }
    }
    basisPoints = Math.round(input.value * 100)
  } else {
    if (input.value <= 0) {
      return { ok: false, error: "amount" }
    }
    const rate = await readEgpRate(c.settings)
    amountMinor = Math.max(1, Math.round(Math.round(input.value * 100) / rate))
  }

  let maxUses: number | null = null
  if (input.maxUses.trim() !== "") {
    const parsed = Number(input.maxUses)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "maxuses" }
    }
    maxUses = parsed
  }

  let expiresAt: string | null = null
  if (input.expiresAt.trim() !== "") {
    const date = new Date(input.expiresAt)
    if (Number.isNaN(date.getTime())) {
      return { ok: false, error: "date" }
    }
    expiresAt = date.toISOString()
  }

  try {
    await c.promos.create({ id: newId(), code, kind, basisPoints, amountMinor, maxUses, expiresAt })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "duplicate" }
    }
    throw error
  }

  return { ok: true }
}

export async function togglePromo(c: Container, id: string, active: boolean): Promise<void> {
  await c.promos.setActive(id, !active)
}

export async function readSettings(c: Container): Promise<AdminSettingsDto> {
  const [markup, vipCurve, vipLevels, egpStored, coinIndex, p2pMinor, defaultMethod] = await Promise.all([
    readBaseMarkup(c.settings, "mlbb"),
    readVipMarkupCurve(c.settings, "mlbb"),
    readVipLevels(c.settings, "mlbb"),
    c.settings.get(EGP_RATE_KEY),
    readCoinIndex(c.settings),
    readP2pManualOverride(c.settings),
    readStorefrontDefaultMethod(c.settings),
  ])

  return {
    vipCurve: vipCurve ?? [{ coins: 0, basisPoints: markup.basisPoints }],
    vipLevels: vipLevels.map((level) => ({
      key: level.key,
      coins: level.coins,
      basisPoints: level.basisPoints,
      title: level.title,
      icon: level.icon,
      color: level.color,
    }) satisfies AdminLevelDto),
    egpRate:
      egpStored !== null && Number.isFinite(Number(egpStored)) ? egpStored : String(DEFAULT_EGP_RATE),
    coinIndex: coinIndex.indexMicro / 1_000_000,
    coinValueUsd: coinIndex.coinValueMinor / 100,
    coinIndexCapBps: coinIndex.capBps,
    coinIndexUpdatedAt: coinIndex.updatedAt,
    coinIndexLastMoveBps: coinIndexLastMoveBps(coinIndex),
    coinIndexCapped: coinIndexCapped(coinIndex),
    p2pRateEgp: p2pMinor === null ? null : p2pMinor / 100,
    defaultMethod,
  }
}

export type SettingsInput = {
  readonly egpRate: number
  readonly coinIndexCapBps: number
  readonly p2pRateEgp?: string | number | null
  readonly defaultMethod?: string
}

export type VipLevelsInput = { readonly levels: readonly unknown[] }

const VIP_LEVELS_INVALID = "مستويات VIP مش صالحة"

export async function saveVipLevels(c: Container, input: VipLevelsInput): Promise<AdminResult> {
  if (!Array.isArray(input.levels) || input.levels.length < 2) {
    return { ok: false, error: VIP_LEVELS_INVALID }
  }

  const levels: Level[] = []
  for (let i = 0; i < input.levels.length; i++) {
    const entry = input.levels[i]
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: VIP_LEVELS_INVALID }
    }
    const rec = entry as Record<string, unknown>
    const { key, title, icon, color } = rec
    if (typeof key !== "string" || typeof title !== "string" || typeof icon !== "string" || typeof color !== "string") {
      return { ok: false, error: VIP_LEVELS_INVALID }
    }
    const coins = Number(String(rec.coins ?? ""))
    const percent = Number(String(rec.percent ?? ""))
    if (!Number.isFinite(coins) || !Number.isFinite(percent) || coins < 0 || percent < 0) {
      return { ok: false, error: VIP_LEVELS_INVALID }
    }
    levels.push({
      key,
      coins,
      basisPoints: Math.round(percent * 100),
      title,
      icon: icon as Level["icon"],
      color: color as Level["color"],
    })
  }

  try {
    validateLevels(levels)
  } catch {
    return { ok: false, error: VIP_LEVELS_INVALID }
  }

  await persistVipLevels(c.settings, "mlbb", levels)
  return { ok: true }
}

export async function saveSettings(c: Container, input: SettingsInput): Promise<AdminResult> {
  if (!Number.isFinite(input.egpRate)) {
    return { ok: false, error: "invalid" }
  }
  if (!Number.isInteger(input.coinIndexCapBps) || input.coinIndexCapBps < 0 || input.coinIndexCapBps > 10_000) {
    return { ok: false, error: "invalid" }
  }

  if (input.defaultMethod !== undefined && !isStorefrontMethod(input.defaultMethod)) {
    return { ok: false, error: "invalid" }
  }

  if (input.p2pRateEgp !== undefined && input.p2pRateEgp !== null) {
    const raw = String(input.p2pRateEgp).trim()
    if (raw === "") {
      await c.settings.set(P2P_RATE_MANUAL_KEY, "")
    } else {
      if (!/^\d+(\.\d+)?$/.test(raw)) {
        return { ok: false, error: "invalid" }
      }
      const parts = raw.split(".")
      if (parts.length === 2 && parts[1].length > 2) {
        return { ok: false, error: "invalid" }
      }
      const [intPart, fracPart = ""] = parts
      if (intPart === "") {
        return { ok: false, error: "invalid" }
      }
      // avoid leading zeros issues except for "0" itself - but must be positive
      const num = Number(raw)
      if (!Number.isFinite(num) || num <= 0) {
        return { ok: false, error: "invalid" }
      }
      if (num > 1000000) {
        return { ok: false, error: "invalid" }
      }
      const minor = BigInt(intPart) * 100n + BigInt((fracPart + "00").slice(0, 2))
      if (minor <= 0n) {
        return { ok: false, error: "invalid" }
      }
      await c.settings.set(P2P_RATE_MANUAL_KEY, minor.toString())
    }
  } else if (input.p2pRateEgp === null) {
    await c.settings.set(P2P_RATE_MANUAL_KEY, "")
  } else if (input.p2pRateEgp === undefined) {
    // if not provided, don't change? but follow pattern of form - better to be permissive; but better handle empty case too
    // to match "empty/blank → store """ semantics if passed as empty
  }

  await c.settings.set(EGP_RATE_KEY, String(input.egpRate))
  await writeCoinIndexCap(c.settings, input.coinIndexCapBps)
  if (input.defaultMethod !== undefined) {
    await writeStorefrontDefaultMethod(c.settings, input.defaultMethod)
  }

  return { ok: true }
}

export async function saveMarkup(c: Container, input: { markupPercent: number }): Promise<AdminResult> {
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < 0) {
    return { ok: false, error: "invalid" }
  }

  await c.settings.set(markupBaseKey("mlbb"), String(Math.round(input.markupPercent * 100)))

  return { ok: true }
}

export async function saveP2pSettings(
  c: Container,
  input: { windowHours: number; syncIntervalSeconds: number; outlierSigma: number },
): Promise<AdminResult> {
  if (!Number.isSafeInteger(input.windowHours) || input.windowHours < MIN_P2P_WINDOW_HOURS || input.windowHours > MAX_P2P_WINDOW_HOURS) {
    return { ok: false, error: "invalid" }
  }
  if (
    !Number.isSafeInteger(input.syncIntervalSeconds) ||
    input.syncIntervalSeconds < MIN_P2P_SYNC_INTERVAL_SECONDS ||
    input.syncIntervalSeconds > MAX_P2P_SYNC_INTERVAL_SECONDS
  ) {
    return { ok: false, error: "invalid" }
  }
  if (!Number.isSafeInteger(input.outlierSigma) || input.outlierSigma < MIN_P2P_OUTLIER_SIGMA || input.outlierSigma > MAX_P2P_OUTLIER_SIGMA) {
    return { ok: false, error: "invalid" }
  }
  try {
    await writeP2pSettings(c.settings, input)
  } catch {
    return { ok: false, error: "invalid" }
  }
  return { ok: true }
}

export async function saveCoinIndexCap(c: Container, capBps: number): Promise<AdminResult> {
  if (!Number.isSafeInteger(capBps) || capBps < 0 || capBps > 10_000) {
    return { ok: false, error: "invalid" }
  }
  try {
    await writeCoinIndexCap(c.settings, capBps)
  } catch {
    return { ok: false, error: "invalid" }
  }
  return { ok: true }
}

export async function listUsers(c: Container, skip: number, take: number): Promise<AdminUserPageDto> {
  const { rows, total } = await c.accounts.list({ skip, take })
  return {
    rows: rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      email: row.email,
      coinBalance: row.coinBalance,
      createdAt: row.createdAt,
    })),
    total,
    skip,
  }
}

export async function readUser(c: Container, id: string): Promise<AdminUserDetailDto | null> {
  const account = await c.accounts.findById(id)
  if (account === null) return null

  const now = new Date()
  const [wallet, entries, coinsConsumed30d, curve, override] = await Promise.all([
    c.wallets.getOrCreate(account.clientId),
    c.wallets.listEntries(account.clientId, 20),
    readQualifyingVolume(c.activity, account.clientId, now),
    readVipMarkupCurve(c.settings, "mlbb"),
    readMarkupOverride(c.settings, account.clientId),
  ])

  const markupBasisPoints = await resolveClientMarkup(c.settings, "mlbb", {
    clientId: account.clientId,
    coinsConsumed: coinsConsumed30d,
  })

  return {
    account: { id: account.id, email: account.email, clientId: account.clientId },
    wallet: { coinBalance: wallet.coinBalance },
    entries: entries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
    coinsConsumed30d,
    markupBasisPoints,
    nextBreakpoint: curve === null ? null : nextBreakpoint(curve, coinsConsumed30d),
    override,
  }
}

export type MarkupOverrideInput = {
  readonly clientId: string
  readonly markupPercent: number
  readonly note?: string
}

export async function saveMarkupOverride(c: Container, input: MarkupOverrideInput): Promise<AdminResult> {
  if (input.clientId.trim() === "") {
    return { ok: false, error: "account" }
  }
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < 0) {
    return { ok: false, error: "invalid" }
  }
  const basisPoints = Math.round(input.markupPercent * 100)
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    return { ok: false, error: "invalid" }
  }
  const note = input.note?.trim()
  await c.settings.set(
    markupOverrideKey(input.clientId),
    JSON.stringify({
      basisPoints,
      ...(note ? { note } : {}),
      updatedAt: new Date().toISOString(),
    }),
  )
  return { ok: true }
}

export async function clearMarkupOverride(c: Container, clientId: string): Promise<AdminResult> {
  if (clientId.trim() === "") {
    return { ok: false, error: "account" }
  }
  await c.settings.delete(markupOverrideKey(clientId))
  return { ok: true }
}

export type WalletAdjustment = {
  readonly clientId: string
  readonly accountId: string
  readonly amount: number
  readonly direction: string
  readonly reason: string
}

export async function adjustWallet(c: Container, input: WalletAdjustment): Promise<WalletOutcomeDto> {
  let accountId = input.accountId
  if (accountId === "" && input.clientId !== "") {
    const { rows } = await c.accounts.list({ skip: 0, take: 1000 })
    accountId = rows.find((row) => row.clientId === input.clientId)?.id ?? ""
  }

  if (input.direction !== "credit" && input.direction !== "debit") {
    return { ok: false, error: "invalid", accountId }
  }

  try {
    assertPositiveCoins(input.amount)
  } catch {
    return { ok: false, error: "amount", accountId }
  }

  if (input.clientId === "") {
    return { ok: false, error: "account", accountId }
  }

  if (input.reason.trim() === "" && input.direction === "debit") {
    return { ok: false, error: "reason", accountId }
  }

  if (input.direction === "credit") {
    await c.wallets.credit(input.clientId, input.amount, input.reason.trim() === "" ? "grant" : input.reason)
    return { ok: true, accountId }
  }

  const debited = await c.wallets.debit(input.clientId, input.amount, input.reason)
  return debited ? { ok: true, accountId } : { ok: false, error: "insufficient", accountId }
}

export async function syncCatalogue(c: Container): Promise<void> {
  await c.syncCatalogue("mlbb")
}

export async function recordDeposit(
  c: Container,
  input: { clientId: string; currency: CurrencyCode; amountMinor: number },
): Promise<
  | { ok: true; deposit: { id: string; currency: string; amountMinor: number; rateMinor: number; coins: number; wacEgpMinor: number; egpValueMinor: number; createdAt: string }; wallet: { clientId: string; coinBalance: number } }
  | { ok: false; error: string }
> {
  const outcome = await c.recordDeposit(input)
  if (!outcome.ok) {
    return { ok: false, error: outcome.error }
  }
  const d = outcome.deposit
  return {
    ok: true,
    deposit: {
      id: d.id,
      currency: d.currency,
      amountMinor: d.amountMinor,
      rateMinor: d.rateMinor,
      coins: d.coins,
      wacEgpMinor: d.wacEgpMinor,
      egpValueMinor: d.egpValueMinor,
      createdAt: d.createdAt,
    },
    wallet: { clientId: outcome.wallet.clientId, coinBalance: outcome.wallet.coinBalance },
  }
}

export type RecordFundingInput = {
  readonly egpPaidMinor: number
  readonly usdtMinor: number
}

export async function recordFunding(
  c: Container,
  input: RecordFundingInput,
): Promise<
  | { ok: true; funding: { id: string; egpPaidMinor: number; usdtMinor: number; createdAt: string } }
  | { ok: false; error: string }
> {
  let balance: Awaited<ReturnType<Container["distributor"]["getBalance"]>>
  let snapshot: Awaited<ReturnType<Container["treasury"]["snapshot"]>>
  try {
    balance = await c.distributor.getBalance()
    snapshot = await c.treasury.snapshot()
  } catch {
    return { ok: false, error: "exceeds_free" }
  }
  if (input.usdtMinor > freeUsdtMinor(balance.balanceMinor, snapshot.usdtMinor)) {
    return { ok: false, error: "exceeds_free" }
  }
  try {
    const f = await c.treasury.recordFunding({
      egpPaidMinor: input.egpPaidMinor,
      usdtMinor: input.usdtMinor,
    })
    return {
      ok: true,
      funding: {
        id: f.id,
        egpPaidMinor: f.egpPaidMinor,
        usdtMinor: f.usdtMinor,
        createdAt: f.createdAt,
      },
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return { ok: false, error: "invalid" }
    }
    throw error
  }
}

export async function rollbackFunding(
  c: Container,
  id: string,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "locked" | "invalid" }> {
  if (id.trim() === "") {
    return { ok: false, error: "invalid" }
  }
  const lot = await c.fundings.findById(id)
  if (lot === null) {
    return { ok: false, error: "not_found" }
  }
  const [snapshot, coins, coinIndex] = await Promise.all([c.treasury.snapshot(), c.coinSupply.totalCoins(), readCoinIndex(c.settings)])
  const reserved = reservedUsdtMinor(coins, coinIndex.coinValueMinor)
  const recordedAfter = snapshot.usdtMinor - lot.usdtMinor
  const basisAfter = snapshot.basisEgpMinor - lot.egpPaidMinor
  if (recordedAfter < 0 || basisAfter < 0 || recordedAfter < reserved) {
    return { ok: false, error: "locked" }
  }
  const removed = await c.fundings.remove(id)
  if (!removed) {
    return { ok: false, error: "not_found" }
  }
  return { ok: true }
}

export async function readTreasuryDashboard(c: Container): Promise<TreasuryDashboardDto> {
  const snapshot = await c.treasury.snapshot()

  const rate = await readEgpRate(c.settings)

  let balance: TreasuryDashboardDto["balance"] = null
  let balanceAt: string | null = null
  let balanceError = false
  let liveUsdtMinor: number | null = null
  try {
    const distributor = await c.distributor.getBalance()
    liveUsdtMinor = distributor.balanceMinor
    balance = {
      usdMinor: distributor.balanceMinor,
      egpMinor: toEgp(money(distributor.balanceMinor, "USD"), rate).minor,
    }
    balanceAt = new Date().toISOString()
  } catch {
    balanceError = true
    balanceAt = null
  }

  let p2pEgpPerUsdtMinor: number | null = null
  let p2pMaxEgpPerUsdtMinor: number | null = null
  try {
    const p2pRate = await c.p2pRate.read()
    p2pEgpPerUsdtMinor = p2pRate?.egpPerUsdtMinor ?? null
    p2pMaxEgpPerUsdtMinor = p2pRate?.range?.maxEgpPerUsdtMinor ?? null
  } catch {
    p2pEgpPerUsdtMinor = null
    p2pMaxEgpPerUsdtMinor = null
  }

  const coinIndex = await readCoinIndex(c.settings)
  const depositRates = await Promise.all(
    (["EGP", "USD"] as const).map(async (currency) => ({
      currency,
      rateMinor: await readDepositRate(
        c.settings,
        currency,
        snapshot.wacEgpMinor,
        coinIndex.coinValueMinor,
      ),
    })),
  )

  const reconciliationRecord = await c.reconciliations.latest()
  const reconciliation =
    reconciliationRecord === null
      ? null
      : {
          status: reconciliationRecord.status,
          gapUsdtMinor: reconciliationRecord.gapUsdtMinor,
          createdAt: reconciliationRecord.createdAt,
        }

  const [fundingsRaw, depositsRaw, consumptionsRaw] = await Promise.all([
    c.fundings.listRecent(50),
    c.deposits.listRecent(50),
    c.consumptions.listRecent(50),
  ])

  const freeUsdtMinorValue = freeUsdtMinor(liveUsdtMinor, snapshot.usdtMinor)
  const coinsOutstanding = await c.coinSupply.totalCoins()
  const availableUsdtMinorValue = availableUsdtMinor(
    snapshot.usdtMinor,
    reservedUsdtMinor(coinsOutstanding, coinIndex.coinValueMinor),
  )

  const fundings = fundingsRaw.map((f) => ({
    id: f.id,
    egpPaidMinor: f.egpPaidMinor,
    usdtMinor: f.usdtMinor,
    createdAt: f.createdAt,
  }))

  const deposits = depositsRaw.map((d) => ({
    id: d.id,
    clientId: d.clientId,
    currency: d.currency,
    amountMinor: d.amountMinor,
    rateMinor: d.rateMinor,
    coins: d.coins,
    wacEgpMinor: d.wacEgpMinor,
    egpValueMinor: d.egpValueMinor,
    createdAt: d.createdAt,
  }))

  const consumptions = consumptionsRaw.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    usdtMinor: row.usdtMinor,
    basisEgpMinor: row.basisEgpMinor,
    wacEgpMinor: row.wacEgpMinor,
    createdAt: row.createdAt,
  }))

  return {
    balance,
    balanceAt,
    balanceError,
    p2pEgpPerUsdtMinor,
    p2pMaxEgpPerUsdtMinor,
    recordedUsdtMinor: snapshot.usdtMinor,
    recordedBasisEgpMinor: snapshot.basisEgpMinor,
    wacEgpMinor: snapshot.wacEgpMinor,
    freeUsdtMinor: freeUsdtMinorValue,
    availableUsdtMinor: availableUsdtMinorValue,
    depositRates,
    reconciliation,
    fundings,
    deposits,
    consumptions,
  }
}
