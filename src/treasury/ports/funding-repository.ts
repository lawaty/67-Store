/**
 * Declares funding-lot persistence: append, total, and list funding lots.
 * Every lot carries its EGP basis at append time.
 */
import { Funding } from "../domain/funding"
import { TreasuryTotals } from "./totals"
export interface FundingRepository {
  append(lot: Funding): Promise<void>
  totals(): Promise<TreasuryTotals>
  listRecent(limit: number): Promise<Funding[]>
  findById(id: string): Promise<Funding | null>
  remove(id: string): Promise<boolean>
}
