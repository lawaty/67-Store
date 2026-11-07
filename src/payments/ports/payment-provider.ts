/**
 * Declares the capability to charge an order through an external payment provider and verify its resulting status.
 */
import { Money } from "@/shared/money"
import { PaymentProviderName, PaymentStatus } from "../domain/payment"

export type ChargeRequest = {
  readonly orderId: string
  readonly amount: Money
  readonly returnUrl: string
}

export type ChargeResult = {
  readonly providerReference: string
  readonly redirectUrl: string
}

export interface PaymentProvider {
  readonly name: PaymentProviderName
  charge(request: ChargeRequest): Promise<ChargeResult>
  verify(providerReference: string): Promise<PaymentStatus>
}
