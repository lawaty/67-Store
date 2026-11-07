/**
 * Defines the order lifecycle statuses and events, enforcing allowed state
 * transitions and rejecting invalid ones.
 */
export type OrderStatus =
  | "CREATED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "FULFILLING"
  | "DELIVERED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"

export type OrderEvent =
  | "REQUEST_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_EXPIRED"
  | "FULFILMENT_STARTED"
  | "DELIVERY_SUCCEEDED"
  | "DELIVERY_FAILED"
  | "REFUNDED"

export class InvalidTransition extends Error {
  constructor(event: OrderEvent, status: OrderStatus) {
    super(`Cannot apply ${event} to ${status}`)
  }
}

export function transition(status: OrderStatus, event: OrderEvent): OrderStatus {
  if (status === "CREATED" && event === "REQUEST_PAYMENT") {
    return "AWAITING_PAYMENT"
  }
  if (status === "AWAITING_PAYMENT" && event === "PAYMENT_CONFIRMED") {
    return "PAID"
  }
  if (status === "AWAITING_PAYMENT" && event === "PAYMENT_EXPIRED") {
    return "EXPIRED"
  }
  if (status === "PAID" && event === "FULFILMENT_STARTED") {
    return "FULFILLING"
  }
  if (status === "FULFILLING" && event === "DELIVERY_SUCCEEDED") {
    return "DELIVERED"
  }
  if (status === "FULFILLING" && event === "DELIVERY_FAILED") {
    return "FAILED"
  }
  if (status === "FAILED" && event === "REFUNDED") {
    return "REFUNDED"
  }
  throw new InvalidTransition(event, status)
}
