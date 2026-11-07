/**
 * Defines the API boundary DTOs for admin dashboards, reports, settings,
 * users, and promos; money values are integer minor units.
 */

import type { MoneyDto } from "./money"
import type { OrderStatusDto } from "./order"
import type { StorefrontMethodDto } from "./storefront"
import type { WalletEntryDto } from "./account"

export type P2pRateSourceDto = "binance-p2p" | "settings:manual" | "settings:last-known"

export type P2pPriceRangeDto = {
  readonly minEgpPerUsdtMinor: number
  readonly avgEgpPerUsdtMinor: number
  readonly maxEgpPerUsdtMinor: number
  readonly adCount: number
  readonly stdDevEgpPerUsdtMinor: number | null
  readonly outlierCount: number
}

export type AdminStatsDto = {
  readonly balanceUsdtMinor: number | null
  readonly p2pEgpPerUsdtMinor: number | null
  readonly wacEgpMinor: number | null
  readonly availableUsdtMinor: number | null
  readonly recordedUsdtMinor: number | null
  readonly reservedUsdtMinor: number | null
  readonly balanceError: boolean
  readonly updatedAt: string
}

export type AdminOrderRowDto = {
  readonly id: string
  readonly token: string
  readonly clientId: string | null
  readonly productName: string
  readonly player: { readonly userId: string; readonly serverId: string }
  readonly price: MoneyDto
  readonly discountMinor: number | null
  readonly costMinor: number | null
  readonly status: OrderStatusDto
  readonly createdAt: string | null
}

export type AdminOrderPageDto = {
  readonly rows: readonly AdminOrderRowDto[]
  readonly total: number
  readonly skip: number
}

export type AdminProductDto = {
  readonly id: string
  readonly name: string
  readonly cost: MoneyDto
  readonly active: boolean
  readonly syncedAt: string | null
  readonly buyable: boolean
  readonly fundingGapMinor: number
  readonly unavailableReason: "inactive" | "insufficient_funds" | "unknown_balance" | null
}

export type AdminPromoDto = {
  readonly id: string
  readonly code: string
  readonly kind: "PERCENT" | "FIXED"
  readonly basisPoints: number | null
  readonly amountMinor: number | null
  readonly amountEgpMinor: number | null
  readonly uses: number
  readonly maxUses: number | null
  readonly expiresAt: string | null
  readonly active: boolean
}

export type AdminLevelDto = {
  readonly key: string
  readonly coins: number
  readonly basisPoints: number
  readonly title: string
  readonly icon: string
  readonly color: string
}

export type AdminSettingsDto = {
  readonly vipCurve: readonly { coins: number; basisPoints: number }[]
  readonly vipLevels: readonly AdminLevelDto[]
  readonly egpRate: string
  readonly coinIndex: number
  readonly coinValueUsd: number
  readonly coinIndexCapBps: number
  readonly coinIndexUpdatedAt: string | null
  readonly coinIndexLastMoveBps: number | null
  readonly coinIndexCapped: boolean
  readonly p2pRateEgp: number | null
  readonly defaultMethod: StorefrontMethodDto
}

export type AdminUserRowDto = {
  readonly id: string
  readonly clientId: string
  readonly email: string
  readonly coinBalance: number
  readonly createdAt: string
}

export type AdminUserPageDto = {
  readonly rows: readonly AdminUserRowDto[]
  readonly total: number
  readonly skip: number
}

export type AdminUserDetailDto = {
  readonly account: { readonly id: string; readonly email: string; readonly clientId: string }
  readonly wallet: { readonly coinBalance: number }
  readonly entries: readonly WalletEntryDto[]
  readonly coinsConsumed30d: number
  readonly markupBasisPoints: number
  readonly nextBreakpoint: { readonly coins: number; readonly basisPoints: number } | null
  readonly override: { readonly basisPoints: number; readonly note?: string; readonly updatedAt: string } | null
}

export type AdminClientProjectionDto = {
  readonly clientId: string
  readonly email: string | null
  readonly coinsConsumed30d: number
  readonly markupBasisPoints: number
  readonly expectedMarkupBasisPoints7d: number
  readonly expectedMarkupBasisPoints30d: number
  readonly expectedProfit7Minor: number
  readonly expectedProfit30Minor: number
}

export type AdminDashboardDto = {
  readonly balance: { readonly usdMinor: number; readonly egpMinor: number } | null
  readonly balanceAt: string | null
  readonly balanceError: boolean
  readonly unfulfillableCount: number
  readonly showWarning: boolean
  readonly operations: { readonly mode: "live" | "sandbox"; readonly liveReady: boolean }
  readonly treasury: {
    readonly expectedUsdtMinor: number
    readonly recordedUsdtMinor: number
    readonly freeUsdtMinor: number
    readonly wacEgpMinor: number
    readonly basisEgpMinor: number
    readonly breakEvenEgpMinor: number
    readonly coinsOutstanding: number
    readonly reservedUsdtMinor: number
    readonly availableUsdtMinor: number
    readonly coverageBasisPoints: number
    readonly availableCoins: number
    readonly averageCoinFundingCostEgpMinor: number
    readonly coinIndex: number
    readonly coinValueUsdMinor: number
    readonly coinIndexUpdatedAt: string | null
    readonly coinIndexCapBps: number
    readonly coinIndexLastMoveBps: number | null
    readonly coinIndexCapped: boolean
  }
  readonly history: {
    readonly p2p: readonly {
      readonly day: string
      readonly hour: string | null
      readonly egpPerUsdtMinor: number
      readonly minEgpPerUsdtMinor?: number
      readonly avgEgpPerUsdtMinor?: number
      readonly maxEgpPerUsdtMinor?: number
    }[]
    readonly wac: readonly { readonly day: string; readonly wacEgpMinor: number }[]
  }
  readonly projections: {
    readonly treasuryRunwayDays: number | null
    readonly coinRunwayDays: number | null
    readonly availableUsdtEgpMinor: number | null
  }
  readonly clientProjections: readonly AdminClientProjectionDto[]
  readonly pricing: { readonly baseMarkupBasisPoints: number; readonly vipCurve: readonly { readonly coins: number; readonly basisPoints: number }[] }
  readonly p2p: {
    readonly egpPerUsdtMinor: number
    readonly source: P2pRateSourceDto
    readonly fetchedAt: string | null
    readonly stale: boolean
    readonly bankTransferEgpPerUsdtMinor: number | null
    readonly vodafoneEgpPerUsdtMinor: number | null
    readonly range: P2pPriceRangeDto | null
  } | null
  readonly p2pSettings: {
    readonly windowHours: number
    readonly minWindowHours: number
    readonly maxWindowHours: number
    readonly syncIntervalSeconds: number
    readonly minSyncIntervalSeconds: number
    readonly maxSyncIntervalSeconds: number
    readonly recommendedSyncIntervalSeconds: number
    readonly outlierSigma: number
    readonly minOutlierSigma: number
    readonly maxOutlierSigma: number
  }
  readonly summary: {
    readonly tradingMargin: { readonly sevenDaysMinor: number; readonly thirtyDaysMinor: number }
    readonly fxResult: { readonly sevenDaysEgpMinor: number; readonly thirtyDaysEgpMinor: number }
    readonly delivered: { readonly sevenDays: number; readonly thirtyDays: number }
    readonly revenue: { readonly sevenDaysMinor: number; readonly thirtyDaysMinor: number }
    readonly series: readonly { readonly day: string; readonly ordersCount: number; readonly revenueUsdMinor: number; readonly marginUsdMinor: number; readonly coinsSold: number }[]
  }
}
