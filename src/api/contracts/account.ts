/**
 * Defines the API boundary shapes for account, order summary, wallet entry,
 * and gaming profile data; money values are integer minor units.
 */

import type { MoneyDto } from "./money"
import type { OrderStatusDto } from "./order"

export type ProfileDto = {
  readonly id: string
  readonly label: string
  readonly userId: string
  readonly serverId: string
  readonly game: string
  readonly playerName: string | null
  readonly createdAt: string | null
  readonly preferred: boolean
}

export type AccountOrderDto = {
  readonly id: string
  readonly token: string
  readonly status: OrderStatusDto
  readonly productName: string
  readonly price: MoneyDto
  readonly createdAt: string | null
  readonly userId: string
  readonly serverId: string
  readonly playerName: string | null
}

export type WalletEntryDto = {
  readonly id: string
  readonly amount: number
  readonly reason: string
  readonly createdAt: string
}

export type AccountLevelDto = {
  readonly key: string
  readonly title: string
  readonly icon: string
  readonly color: string
  readonly coins: number
  readonly basisPoints: number
}

export type AccountEarnedBadgeDto = {
  readonly levelKey: string
  readonly title: string
  readonly icon: string
  readonly color: string
  readonly coins: number
  readonly earnedAt: string
}

export type AccountLevelsDto = {
  readonly volume30d: number
  readonly current: AccountLevelDto
  readonly next: AccountLevelDto | null
  readonly toNext: number
  readonly percent: number
  readonly effectiveMarginBasisPoints: number
  readonly levels: readonly AccountLevelDto[]
  readonly earnedBadges: readonly AccountEarnedBadgeDto[]
}

export type AccountDto = {
  readonly orders: readonly AccountOrderDto[]
  readonly wallet: { readonly coinBalance: number }
  readonly entries: readonly WalletEntryDto[]
  readonly profiles: readonly ProfileDto[]
  readonly levels: AccountLevelsDto
  readonly fundingAvailable: boolean
}
