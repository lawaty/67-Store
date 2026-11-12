/**
 * Payment aggregate enforcing non-empty identifiers and provider references, with immutable status, provider, and money amount in integer minor units.
 */
import { Money } from "@/shared/money"

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED"
export type PaymentProviderName = "PAYMOB" | "CRYPTO" | "COINS"
export type Payment = {
  readonly id: string
  readonly orderId: string
  readonly provider: PaymentProviderName
  readonly providerReference: string
  readonly amount: Money
  readonly status: PaymentStatus
}

export function payment(input: {
  id: string
  orderId: string
  provider: PaymentProviderName
  providerReference: string
  amount: Money
  status: PaymentStatus
}): Payment {
  const trimmedId = input.id.trim()
  if (trimmedId.length === 0) {
    throw new RangeError()
  }
  const trimmedOrderId = input.orderId.trim()
  if (trimmedOrderId.length === 0) {
    throw new RangeError()
  }
  const trimmedProviderReference = input.providerReference.trim()
  if (trimmedProviderReference.length === 0) {
    throw new RangeError()
  }
  return Object.freeze({
    id: trimmedId,
    orderId: trimmedOrderId,
    provider: input.provider,
    providerReference: trimmedProviderReference,
    amount: input.amount,
    status: input.status,
  })
}

/**
 * Payment status transition policy. PENDING may settle into any terminal state.
 * An EXPIRED or FAILED payment may still settle as PAID, because a provider can
 * capture a payment after we gave up on it. Once PAID, a payment is terminal: a
 * later FAILED/EXPIRED/PAID event must never move it.
 */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false
  if (from === "PAID") return false
  if (from === "PENDING") return true
  return to === "PAID"
}
