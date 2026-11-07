/**
 * Declares treasury reporting queries for order summaries and daily/WAC time
 * series since a given timestamp.
 */
import type { DailySeriesPoint } from "@/treasury/domain/report"

export type OrderSummarySince = { readonly deliveredCount: number; readonly revenueUsdMinor: number; readonly marginUsdMinor: number }
export type WacSeriesPoint = { readonly day: string; readonly wacEgpMinor: number }

export type ClientSummarySince = {
  readonly clientId: string
  readonly coinsConsumed: number
  readonly marginUsdMinor: number
}

export interface TreasuryReportRepository {
  summarySince(since: string): Promise<OrderSummarySince>
  dailySeriesSince(since: string): Promise<readonly DailySeriesPoint[]>
  wacSeriesSince(since: string): Promise<readonly WacSeriesPoint[]>
  clientSummarySince(since: string): Promise<readonly ClientSummarySince[]>
}
