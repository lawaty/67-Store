/**
 * Declares reconciliation persistence: append reconciliation records and
 * retrieve the latest result.
 */
import { ReconciliationStatus } from "../domain/reconciliation"
export type ReconciliationRecord = {
  readonly id: string
  readonly expectedUsdtMinor: number
  readonly supplierUsdtMinor: number
  readonly gapUsdtMinor: number
  readonly status: ReconciliationStatus
  readonly createdAt: string
}
export interface ReconciliationRepository {
  append(record: ReconciliationRecord): Promise<void>
  latest(): Promise<ReconciliationRecord | null>
}
