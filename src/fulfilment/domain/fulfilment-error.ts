/**
 * Domain error raised when fulfilment cannot proceed due to an invalid order
 * state or missing distributor information.
 */
export class FulfilmentError extends Error {
  constructor(message: string) { super(message); this.name = "FulfilmentError" }
}
