/**
 * Dev-only payment provider behind the `fake` payment mode, issuing deterministic references and redirect targets and reporting payments as paid.
 */
import { PaymentProvider } from "../ports/payment-provider"
import { PaymentProviderName, PaymentStatus } from "../domain/payment"

export function createFakeProvider(name: PaymentProviderName): PaymentProvider {
  return {
    name,
    charge: async (request) => {
      const providerReference = `fake_${name.toLowerCase()}_${request.orderId}`
      return {
        providerReference,
        redirectUrl: `/checkout/fake/${providerReference}`,
      }
    },
    verify: async () => {
      return "PAID" as PaymentStatus
    },
  }
}
