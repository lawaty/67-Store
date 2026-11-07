/**
 * Payment aggregate enforcing non-empty identifiers and provider references, with immutable status, provider, and money amount in integer minor units.
 */
import { Money } from "@/shared/money"

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED"
export type PaymentProviderName = "INSTAPAY" | "CRYPTO" | "COINS"
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
