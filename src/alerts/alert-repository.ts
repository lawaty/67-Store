/**
 * Defines the alert record shape and repository contract for appending and
 * listing recent operational alerts.
 */

export type Alert = {
  readonly id: string
  readonly kind: string
  readonly message: string
  readonly createdAt: string
}

export interface AlertRepository {
  append(input: { kind: string; message: string }): Promise<Alert>
  listRecent(limit: number): Promise<Alert[]>
}
