/**
 * Defines order and payment-page boundary shapes for the API.
 * Monetary fields use integer minor units to avoid floating-point rounding at the edge.
 */
import type { MoneyDto } from "./money"

export type OrderStatusDto =
  | "CREATED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "FULFILLING"
  | "DELIVERED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"

export type OrderDto = {
  readonly token: string
  readonly status: OrderStatusDto
  readonly productName: string
  readonly player: { readonly userId: string; readonly serverId: string }
  readonly price: MoneyDto
  readonly egp: MoneyDto
  readonly discountEgp: MoneyDto | null
  readonly promoCode: string | null
  readonly playerName: string | null
}

export type PaymentPageDto = {
  readonly amount: MoneyDto
  readonly provider: "INSTAPAY" | "CRYPTO" | "COINS"
}
