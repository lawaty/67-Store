import { PaymentExpiryRepository } from "../ports/payment-expiry"

export const PAYMENT_EXPIRY_MINUTES = 60

export function createExpirePayments(deps: {
  payments: PaymentExpiryRepository
  now: () => Date
}): () => Promise<{ expired: number }> {
  return async () => {
    const cutoff = new Date(deps.now().getTime() - PAYMENT_EXPIRY_MINUTES * 60_000)
    // The order is left AWAITING_PAYMENT deliberately, because resuming an expired payment already fails with a clear error.
    return { expired: await deps.payments.expirePendingOlderThan(cutoff) }
  }
}
