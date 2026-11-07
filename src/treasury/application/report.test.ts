import { describe, expect, it } from "vitest"
import { DailySeriesPoint, fillDailySeries } from "./report"

describe("fillDailySeries", () => {
  it("full zero-fill over a range", () => {
    const result = fillDailySeries("2026-01-01", "2026-01-03", [])
    expect(result).toEqual([
      { day: "2026-01-01", ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 },
      { day: "2026-01-02", ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 },
      { day: "2026-01-03", ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 },
    ])
  })

  it("ascending order", () => {
    const points: DailySeriesPoint[] = [
      { day: "2026-01-02", ordersCount: 1, revenueUsdMinor: 10, marginUsdMinor: 2, coinsSold: 0 },
      { day: "2026-01-01", ordersCount: 2, revenueUsdMinor: 20, marginUsdMinor: 4, coinsSold: 0 },
    ]
    // points are provided as-is in the map; we validate and fill - but the function must validate structure; also says "ascending by day" in port description, but our fillDailySeries takes points and fills range - we need to be careful about how points are passed
    const result = fillDailySeries("2026-01-01", "2026-01-02", points)
    // but in our validation above, we check for duplicates - fine; order of result is by range iteration (ascending) regardless of input order
    expect(result[0].day).toBe("2026-01-01")
    expect(result[1].day).toBe("2026-01-02")
  })

  it("single-day range (since === until)", () => {
    const result = fillDailySeries("2026-11-03T00:00:00Z", "2026-11-03T23:59:59Z", [])
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe("2026-11-03")
  })

  it("empty points → all zeros", () => {
    const result = fillDailySeries("2026-01-01", "2026-01-02", [])
    expect(result.every((p) => p.ordersCount === 0 && p.revenueUsdMinor === 0 && p.marginUsdMinor === 0)).toBe(true)
  })

  it("fills missing days with zeros while using point values", () => {
    const points: DailySeriesPoint[] = [
      { day: "2026-01-02", ordersCount: 3, revenueUsdMinor: 100, marginUsdMinor: 10, coinsSold: 0 },
    ]
    const result = fillDailySeries("2026-01-01", "2026-01-03", points)
    expect(result).toEqual([
      { day: "2026-01-01", ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 },
      { day: "2026-01-02", ordersCount: 3, revenueUsdMinor: 100, marginUsdMinor: 10, coinsSold: 0 },
      { day: "2026-01-03", ordersCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0, coinsSold: 0 },
    ])
  })

  it("malformed day / out-of-range day / duplicate day / invalid ISO dates → RangeError", () => {
    expect(() => fillDailySeries("not-a-date", "2026-01-01", [])).toThrow(RangeError)
    expect(() => fillDailySeries("2026-01-01", "not-a-date", [])).toThrow(RangeError)
    expect(() => fillDailySeries("2026-01-02", "2026-01-01", [])).toThrow(RangeError)
    expect(() =>
      fillDailySeries("2026-01-01", "2026-01-03", [
        { day: "bad", ordersCount: 1, revenueUsdMinor: 1, marginUsdMinor: 1, coinsSold: 1 } as any,
      ])
    ).toThrow(RangeError)
    expect(() =>
      fillDailySeries("2026-01-01", "2026-01-03", [
        { day: "2026-01-05", ordersCount: 1, revenueUsdMinor: 1, marginUsdMinor: 1, coinsSold: 1 },
      ])
    ).toThrow(RangeError)
    expect(() =>
      fillDailySeries("2026-01-01", "2026-01-03", [
        { day: "2026-01-02", ordersCount: 1, revenueUsdMinor: 1, marginUsdMinor: 1, coinsSold: 1 },
        { day: "2026-01-02", ordersCount: 2, revenueUsdMinor: 2, marginUsdMinor: 2, coinsSold: 0 },
      ])
    ).toThrow(RangeError)
  })

  it("UTC purity (a point for \"2026-11-03\" lands on \"2026-11-03\")", () => {
    const points: DailySeriesPoint[] = [
      { day: "2026-11-03", ordersCount: 5, revenueUsdMinor: 50, marginUsdMinor: 7, coinsSold: 0 },
    ]
    const result = fillDailySeries("2026-11-03", "2026-11-03", points)
    expect(result[0].day).toBe("2026-11-03")
    expect(result[0].ordersCount).toBe(5)
  })
})
