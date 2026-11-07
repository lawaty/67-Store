/**
 * Shared display formatters for money, basis points and indices.
 */
import { CURRENCY_EXPONENTS, currencyExponent, isCurrencyCode } from "@/shared/money"

function formatFixed(value: number, digits: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatMinor(minor: number, currency?: string): string {
  const exponent =
    currency !== undefined && isCurrencyCode(currency)
      ? currencyExponent(currency)
      : CURRENCY_EXPONENTS.USD
  return formatFixed(minor / 10 ** exponent, exponent)
}

export function formatBps(basisPoints: number, digits = 2): string {
  return `${formatFixed(basisPoints / 100, digits)}%`
}

export function formatSignedBps(basisPoints: number, digits = 2): string {
  if (basisPoints === 0) return formatBps(0, digits)
  const formatted = formatBps(basisPoints, digits)
  return basisPoints > 0 ? `+${formatted}` : formatted
}

export function formatIndex(index: number, digits = 4): string {
  return formatFixed(index, digits)
}
