/**
 * Domain error signaling invalid payment operations or state transitions within the payments context.
 */
export class PaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PaymentError"
  }
}
