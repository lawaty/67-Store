/**
 * Expires payments that are still pending after a deadline, so abandoned checkouts
 * stop looking resumable.
 */
export interface PaymentExpiryRepository {
  expirePendingOlderThan(cutoff: Date): Promise<number>
}
