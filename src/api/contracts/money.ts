/**
 * Defines the money boundary shape exchanged by the API.
 * Amounts are represented as integer minor units with an explicit currency code.
 */
import type { CurrencyCode } from "@/shared/money"

export type MoneyDto = { readonly minor: number; readonly currency: CurrencyCode }
