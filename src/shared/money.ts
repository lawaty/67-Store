/**
 * The only constructor for money: integer minor units plus an ISO currency
 * code. Floats are rejected so rounding happens once, at the boundary.
 */
export type CurrencyCode = "USD" | "EGP" | "SAR" | "AED" | "JOD"

export type Money = { readonly minor: number; readonly currency: CurrencyCode }

export const CURRENCY_EXPONENTS: Readonly<Record<CurrencyCode, number>> = {
  USD: 2, EGP: 2, SAR: 2, AED: 2, JOD: 3,
}

export function currencyExponent(currency: CurrencyCode): number {
  return CURRENCY_EXPONENTS[currency]
}

export function minorUnitsPerUnit(currency: CurrencyCode): number {
  return 10 ** currencyExponent(currency)
}

export function majorToMinor(value: number, currency: CurrencyCode): number {
  return Math.round(value * minorUnitsPerUnit(currency))
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value === "USD" || value === "EGP" || value === "SAR" || value === "AED" || value === "JOD"
}

export function money(minor: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError()
  }
  return { minor, currency }
}

export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new TypeError()
  }
  return { minor: a.minor + b.minor, currency: a.currency }
}

export function subtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new TypeError()
  }
  return { minor: a.minor - b.minor, currency: a.currency }
}

export function equals(a: Money, b: Money): boolean {
  return a.minor === b.minor && a.currency === b.currency
}
