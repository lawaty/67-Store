/**
 * Defines storefront boundary shapes for products, viewer state, and profiles.
 * Monetary fields are expressed as integer minor units.
 */
import type { MoneyDto } from "./money"
import type { ProfileDto } from "./account"

export type StorefrontMethodDto = "instapay" | "crypto" | "coins"

export type StorefrontProductDto = {
  readonly id: string
  readonly name: string
  readonly price: MoneyDto
  readonly egp: MoneyDto
  readonly coins: number
  readonly isDiamond: boolean
  readonly directPayAvailable: boolean
  readonly buyable: boolean
  readonly fundingGapMinor: number
  readonly unavailableReason: "insufficient_funds" | "unknown_balance" | null
}

export type StorefrontDto = {
  readonly signedIn: boolean
  readonly products: readonly StorefrontProductDto[]
  readonly rate: number
  readonly coinValue: number
  readonly profiles: readonly ProfileDto[]
  readonly defaultMethod: StorefrontMethodDto
}
