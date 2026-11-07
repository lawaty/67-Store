/**
 * Confirms a payment by provider reference, treating a repeated status update as a no-op and only transitioning an awaiting order to paid after acceptance.
 */
import { PaymentRepository } from "../ports/payment-repository"
import { PaymentProviderName, PaymentStatus } from "../domain/payment"
import { OrderRepository } from "@/ordering"
import { Order, apply, attachPayment } from "@/ordering"

export function createConfirmPayment(deps: {
  payments: PaymentRepository
  orders: OrderRepository
}): (input: { provider: PaymentProviderName; reference: string; status: PaymentStatus }) => Promise<Order | null> {
  return async (input: { provider: PaymentProviderName; reference: string; status: PaymentStatus }): Promise<Order | null> => {
    const payment = await deps.payments.findByProviderReference(input.provider, input.reference)
    if (payment === null) {
      return null
    }
    if (payment.status === input.status) {
      return null
    }
    await deps.payments.markStatus(input.provider, input.reference, input.status)
    if (input.status !== "PAID") {
      return null
    }
    const order = await deps.orders.findById(payment.orderId)
    if (order === null) {
      return null
    }
    if (order.status !== "AWAITING_PAYMENT") {
      return order
    }
    const updated = apply(attachPayment(order, payment.providerReference), "PAYMENT_CONFIRMED")
    await deps.orders.update(updated)
    return updated
  }
}
