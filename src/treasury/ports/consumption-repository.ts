/**
 * Declares persistence for treasury consumptions: append, lookup by order,
 * totals, and summed USDT usage since a timestamp.
 */
import { TreasuryConsumption } from "../domain/consumption"
import { TreasuryTotals } from "./totals"
export interface ConsumptionRepository {
  append(consumption: TreasuryConsumption): Promise<void>
  findByOrder(orderId: string): Promise<TreasuryConsumption | null>
  totals(): Promise<TreasuryTotals>
  sumUsdtSince(since: string): Promise<number>
  listRecent(limit: number): Promise<TreasuryConsumption[]>
}
