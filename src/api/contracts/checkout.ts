/**
 * Defines the API boundary for checkout outcomes, enumerating stable checkout
 * error codes and the success redirect result.
 */

export type CheckoutError =
  | "player"
  | "promo-unknown"
  | "promo-inactive"
  | "promo-expired"
  | "promo-exhausted"
  | "coins"
  | "login"
  | "product"
  | "price"
  | "coverage"
  | "unavailable"
  | "payment"
  | "terms"

export type CheckoutResultDto =
  | { readonly ok: true; readonly redirectUrl: string }
  | { readonly ok: false; readonly error: CheckoutError; readonly redirectUrl?: string }
