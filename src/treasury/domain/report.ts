/**
 * Treasury report domain type: a single UTC-day aggregate used by the
 * report port and application series filler. Shape is stable so persistence
 * and consumers stay unchanged.
 */
export type DailySeriesPoint = {
  readonly day: string
  readonly ordersCount: number
  readonly revenueUsdMinor: number
  readonly marginUsdMinor: number
  readonly coinsSold: number
}
