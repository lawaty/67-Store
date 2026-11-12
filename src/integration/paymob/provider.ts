/**
 * Paymob payment provider implementing the PaymentProvider port, creating a hosted-checkout intention per charge.
 */
import { PaymentProvider, PaymentError } from "@/payments"
import { CreateIntentionInput, Intention } from "./client"

function absolute(base: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const trimmedBase = base.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}

export function createPaymobProvider(deps: {
  client: { createIntention(input: CreateIntentionInput): Promise<Intention> }
  appUrl: string
  newReference: () => string
  paymentMethods: () => Promise<readonly number[]>
}): PaymentProvider {
  return {
    name: "PAYMOB",
    charge: async (request) => {
      if (request.amount.currency !== "EGP") {
        throw new PaymentError("Paymob only accepts EGP payments")
      }
      const trimmedAppUrl = deps.appUrl.trim()
      if (trimmedAppUrl === "") {
        throw new PaymentError("APP_URL is not configured")
      }

      const paymentMethods = await deps.paymentMethods()
      if (paymentMethods.length === 0) {
        throw new PaymentError("No Paymob payment method is enabled")
      }

      const reference = deps.newReference()

      const intention = await deps.client.createIntention({
        amountMinor: request.amount.minor,
        currency: "EGP",
        reference,
        returnUrl: absolute(trimmedAppUrl, request.returnUrl),
        notificationUrl: `${trimmedAppUrl.replace(/\/+$/, "")}/api/webhooks/paymob`,
        paymentMethods,
      })

      return {
        // providerReference is the reference we generated and passed to Paymob as special_reference;
        // the callback carries it back, so it must be returned unchanged (not Paymob's intention id).
        providerReference: reference,
        redirectUrl: intention.checkoutUrl,
      }
    },
    verify: async () => {
      // Nothing in the live path calls verify; Paymob confirms payments through its webhook.
      throw new PaymentError("Paymob confirms payments through its webhook")
    },
  }
}
