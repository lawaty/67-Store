/**
 * Starts a payment for an order awaiting payment, guarding against invalid order states before charging through the selected provider and persisting a pending payment.
 */
import { Order } from "@/ordering"
import { Payment, PaymentProviderName, payment } from "../domain/payment"
import { PaymentProvider } from "../ports/payment-provider"
import { PaymentRepository } from "../ports/payment-repository"
import { PaymentError } from "../domain/payment-error"

function redirectUrlFor(payment: Payment): string {
  if (payment.providerReference.startsWith("fake_")) return `/checkout/fake/${payment.providerReference}`
  throw new PaymentError("A pending payment cannot be resumed")
}

export function createStartPayment(deps: {
  providers: Record<PaymentProviderName, PaymentProvider>
  payments: PaymentRepository
  newId: () => string
}): (input: {
  order: Order
  provider: PaymentProviderName
  returnUrl: string
}) => Promise<{ payment: Payment; redirectUrl: string }> {
  return async (input) => {
    if (input.order.status !== "AWAITING_PAYMENT") {
      throw new PaymentError(
        `Cannot start a payment for an order in ${input.order.status}`
      )
    }
    const existing = await deps.payments.findByOrderId(input.order.id)
    if (existing.some((p) => p.status === "PAID")) {
      throw new PaymentError("Order already has a paid payment")
    }
    const pending = existing.find((p) => p.status === "PENDING")
    if (pending) {
      return { payment: pending, redirectUrl: redirectUrlFor(pending) }
    }
    const chargeResult = await deps.providers[input.provider].charge({
      orderId: input.order.id,
      amount: input.order.price,
      returnUrl: input.returnUrl,
    })
    const p = payment({
      id: deps.newId(),
      orderId: input.order.id,
      provider: input.provider,
      providerReference: chargeResult.providerReference,
      amount: input.order.price,
      status: "PENDING",
    })
    await deps.payments.save(p)
    return { payment: p, redirectUrl: chargeResult.redirectUrl }
  }
}
