/**
 * Exposes treasury daily series data by filling gaps across a UTC date range
 * with zeroed order, revenue, and margin points.
 */
import type { DailySeriesPoint } from "@/treasury/domain/report"

export type { DailySeriesPoint } from "@/treasury/domain/report"

function isValidISODateString(s: string): boolean {
  if (typeof s !== "string") {
    return false
  }
  const trimmed = s.trim()
  if (trimmed.length === 0) {
    return false
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) {
    return false
  }
  return true
}

function toUtcDayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function fillDailySeries(since: string, until: string, points: readonly DailySeriesPoint[]): DailySeriesPoint[] {
  if (!isValidISODateString(since) || !isValidISODateString(until)) {
    throw new RangeError()
  }
  const sinceDate = new Date(since.trim())
  const untilDate = new Date(until.trim())
  const sinceDay = toUtcDayString(sinceDate)
  const untilDay = toUtcDayString(untilDate)
  if (sinceDay > untilDay) {
    throw new RangeError()
  }

  const map = new Map<string, DailySeriesPoint>()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (typeof p.day !== "string") {
      throw new RangeError()
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.day)) {
      throw new RangeError()
    }
    const pd = new Date(p.day + "T00:00:00.000Z")
    if (toUtcDayString(pd) !== p.day) {
      throw new RangeError()
    }
    if (p.day < sinceDay || p.day > untilDay) {
      throw new RangeError()
    }
    if (map.has(p.day)) {
      throw new RangeError()
    }
    if (
      !Number.isSafeInteger(p.ordersCount) ||
      p.ordersCount < 0 ||
      !Number.isSafeInteger(p.revenueUsdMinor) ||
      p.revenueUsdMinor < 0 ||
      !Number.isSafeInteger(p.marginUsdMinor) ||
      p.marginUsdMinor < 0 ||
      !Number.isSafeInteger(p.coinsSold) ||
      p.coinsSold < 0
    ) {
      throw new RangeError()
    }
    map.set(p.day, Object.freeze({ day: p.day, ordersCount: p.ordersCount, revenueUsdMinor: p.revenueUsdMinor, marginUsdMinor: p.marginUsdMinor, coinsSold: p.coinsSold }))
  }

  const result: DailySeriesPoint[] = []
  const start = new Date(sinceDay + "T00:00:00.000Z")
  const end = new Date(untilDay + "T00:00:00.000Z")
  const cursor = new Date(start.getTime())
  while (cursor.getTime() <= end.getTime()) {
    const dayStr = toUtcDayString(cursor)
    const pt = map.get(dayStr)
    if (pt) {
      result.push(pt)
    } else {
      result.push(Object.freeze({ day: dayStr, ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 }))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}
