/**
 * Declares reconciliation persistence: append reconciliation records and
 * retrieve the latest result.
 */
import { ReconciliationStatus } from "../domain/reconciliation"
export type ReconciliationRecord = {
  readonly id: string
  readonly expectedUsdtMilli: number
  readonly supplierUsdtMilli: number
  readonly gapUsdtMilli: number
  readonly status: ReconciliationStatus
  readonly createdAt: string
}
export interface ReconciliationRepository {
  append(record: ReconciliationRecord): Promise<void>
  latest(): Promise<ReconciliationRecord | null>
}
export interface ReconciliationRepository {
  append(record: ReconciliationRecord): Promise<void>
  latest(): Promise<ReconciliationRecord | null>
}
