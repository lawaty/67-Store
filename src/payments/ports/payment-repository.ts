/**
 * Declares persistence capabilities for saving payments, looking them up by provider reference, and updating their status.
 */
import { Payment, PaymentProviderName, PaymentStatus } from "../domain/payment"

export interface PaymentRepository {
  save(p: Payment): Promise<void>
  findByProviderReference(
    provider: PaymentProviderName,
    reference: string
  ): Promise<Payment | null>
  markStatus(
    provider: PaymentProviderName,
    reference: string,
    status: PaymentStatus
  ): Promise<void>
}
