/**
 * Handles fake payment reads and confirmations for development/test flows.
 * Maps provider references to a provider and, when allowed, triggers fulfilment after a paid confirmation.
 */
import type { Container } from "@/container"
import type { PaymentProviderName } from "@/payments"
import { money, type CurrencyCode, type Money } from "@/shared/money"

export type FakePaymentView = {
  readonly amount: Money
  readonly provider: PaymentProviderName
  readonly purpose: "order" | "funding"
  readonly returnUrl: string
}

export function paymentProviderFor(reference: string): PaymentProviderName {
  return reference.startsWith("fake_crypto_") ? "CRYPTO" : "PAYMOB"
}

export async function readFakePayment(c: Container, reference: string): Promise<FakePaymentView | null> {
  const provider = paymentProviderFor(reference)
  const payment = await c.payments.findByProviderReference(provider, reference)
  if (payment !== null) {
    const order = await c.orders.findById(payment.orderId)
    return {
      amount: payment.amount,
      provider,
      purpose: "order",
      returnUrl: order === null ? "/" : "/order/" + order.token,
    }
  }
  const funding = await c.walletFundings.findByReference(reference)
  if (funding !== null) {
    return {
      amount: money(funding.amountMinor, funding.currency as CurrencyCode),
      provider: funding.provider,
      purpose: "funding",
      returnUrl: "/account?tab=wallet&funded=1",
    }
  }
  return null
}

export async function confirmFakePayment(
  c: Container,
  reference: string,
  allowFakeFulfilment: boolean,
): Promise<{ readonly ok: boolean; readonly redirectUrl: string | null }> {
  const view = await readFakePayment(c, reference)
  if (view === null) return { ok: false, redirectUrl: null }
  if (view.purpose === "funding") {
    const settled = await c.settleWalletFunding({ providerReference: reference })
    return { ok: settled.ok, redirectUrl: settled.ok ? "/account?tab=wallet&funded=1" : null }
  }
  const order = await c.confirmPayment({ provider: view.provider, reference, status: "PAID" })
  if (order === null) return { ok: false, redirectUrl: null }
  if (allowFakeFulfilment && order.status === "PAID") {
    await c.fulfilOrder(order)
  }
  return { ok: true, redirectUrl: "/order/" + order.token }
}
