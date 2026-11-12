/**
 * Declares persistence capabilities for saving payments, looking them up by provider reference or order, and updating their status.
 */
import { Payment, PaymentProviderName, PaymentStatus } from "../domain/payment"

export interface PaymentRepository {
  save(p: Payment): Promise<void>
  /**
   * Creates the payment and returns `true`; if a payment with the same
   * `providerReference` already exists for the same order and provider,
   * returns `false`; a conflicting reference still throws.
   */
  saveIfAbsent(p: Payment): Promise<boolean>
  findByProviderReference(
    provider: PaymentProviderName,
    reference: string
  ): Promise<Payment | null>
  findByOrderId(orderId: string): Promise<Payment[]>
  markStatus(
    provider: PaymentProviderName,
    reference: string,
    status: PaymentStatus
  ): Promise<void>
}
