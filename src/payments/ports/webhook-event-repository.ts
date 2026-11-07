/**
 * Declares the capability to record provider webhook events, supporting idempotent processing by event identity.
 */
export interface WebhookEventRepository {
  record(provider: string, eventId: string, payload: unknown): Promise<boolean>
}
