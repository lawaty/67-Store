// no jsdom
import { describe, expect, it } from "vitest"
import {
  areaPath,
  bandPath,
  barRects,
  bufferViewport,
  buildLiveGrid,
  dayTicks,
  niceTicks,
  paddedExtent,
  plotHeight,
  plotWidth,
  scaleX,
  scaleY,
  sliceDayWindow,
  smoothPath,
  yAxisTicks,
  type ChartBox,
  type P2pPriceLike,
} from "./trend-chart-geometry"

const box: ChartBox = {
  width: 200,
  height: 100,
  padding: { top: 10, right: 10, bottom: 20, left: 30 },
}

describe("plot dimensions", () => {
  it("computes plot width/height from box and padding", () => {
    expect(plotWidth(box)).toBe(160)
    expect(plotHeight(box)).toBe(70)
  })

  it("clamps negative plot dimensions to zero", () => {
    const tiny: ChartBox = { width: 10, height: 10, padding: { top: 8, right: 8, bottom: 8, left: 8 } }
    expect(plotWidth(tiny)).toBe(0)
    expect(plotHeight(tiny)).toBe(0)
  })
})

describe("scaleX", () => {
  it("puts a single point at the left edge when count <= 1", () => {
    expect(scaleX(0, 1, box)).toBe(30)
    expect(scaleX(0, 0, box)).toBe(30)
    expect(scaleX(5, 1, box)).toBe(30)
  })

  it("maps index 0 to box.left with slot-start semantics", () => {
    expect(scaleX(0, 5, box)).toBe(30)
  })

  it("maps last index count-1 to left + ((count-1)/count)*plotWidth", () => {
    expect(scaleX(4, 5, box)).toBe(158)
  })

  it("maps index count to left + plotWidth (slot boundary)", () => {
    expect(scaleX(5, 5, box)).toBe(190)
  })

  it("returns finite values for fractional inputs", () => {
    const v = scaleX(1.5, 4.2, box)
    expect(Number.isFinite(v)).toBe(true)
  })
})

describe("scaleY", () => {
  it("maps min to bottom and max to top (SVG y grows downward)", () => {
    expect(scaleY(0, 0, 100, box)).toBe(80)
    expect(scaleY(100, 0, 100, box)).toBe(10)
    expect(scaleY(50, 0, 100, box)).toBe(45)
  })

  it("puts value at vertical middle when max === min", () => {
    expect(scaleY(42, 10, 10, box)).toBe(45)
    expect(scaleY(0, 0, 0, box)).toBe(45)
  })

  it("returns finite values for fractional inputs", () => {
    expect(Number.isFinite(scaleY(1.2, 0.1, 9.9, box))).toBe(true)
  })
})

describe("niceTicks", () => {
  it("returns ascending finite ticks covering a realistic range", () => {
    const ticks = niceTicks(4700, 4900, 5)
    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.length).toBeLessThanOrEqual(8)
    for (const t of ticks) expect(Number.isFinite(t)).toBe(true)
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!)
    expect(ticks[0]!).toBeLessThanOrEqual(4700)
    expect(ticks[ticks.length - 1]!).toBeGreaterThanOrEqual(4900)
  })

  it("handles zero-span and small ranges without NaN", () => {
    for (const [min, max] of [[5, 5], [0, 0], [-1, 1], [0.1, 0.9]] as const) {
      const ticks = niceTicks(min, max, 5)
      expect(ticks.length).toBeGreaterThan(0)
      for (const t of ticks) expect(Number.isNaN(t)).toBe(false)
      for (let i = 1; i < ticks.length; i++) expect(ticks[i]!).toBeGreaterThanOrEqual(ticks[i - 1]!)
    }
  })
})

describe("paths", () => {
  it("returns empty string for empty input", () => {
    expect(areaPath([], 10)).toBe("")
  })

  it("builds a smooth path through every point", () => {
    expect(smoothPath([])).toBe("")
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M 1 2")
    const p = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 2 },
    ])
    expect(p).toContain("M 0 0")
    expect(p).toContain("C ")
    expect(p).toContain("20 2")
    expect(p.split("C ").length - 1).toBe(2)
  })

  it("builds a closed smooth band between two runs", () => {
    expect(bandPath([], [])).toBe("")
    expect(bandPath([{ x: 0, y: 0 }, { x: 10, y: 2 }], [{ x: 0, y: 5 }, { x: 10, y: 7 }])).toContain("M 0 0")
    expect(bandPath([{ x: 0, y: 0 }, { x: 10, y: 2 }], [{ x: 0, y: 5 }, { x: 10, y: 7 }])).toContain("C")
    expect(bandPath([{ x: 0, y: 0 }, { x: 10, y: 2 }], [{ x: 0, y: 5 }, { x: 10, y: 7 }])).toContain("Z")
  })

  it("builds an area path that closes with Z on the baseline", () => {
    const p = areaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 20 },
      ],
      80,
    )
    expect(p.startsWith("M 0 80")).toBe(true)
    expect(p).toContain("C")
    expect(p).toContain("10 20")
    expect(p).toContain("L 10 80")
    expect(p.trim().endsWith("Z")).toBe(true)
  })
})

describe("barRects", () => {
  it("returns empty array for empty values", () => {
    expect(barRects([], 10, box)).toEqual([])
  })

  it("returns zero-height rects at baseline when max <= 0", () => {
    const rects = barRects([1, 2, 3], 0, box)
    expect(rects).toHaveLength(3)
    for (const r of rects) {
      expect(r.height).toBe(0)
      expect(r.y).toBe(80)
      expect(Number.isFinite(r.x)).toBe(true)
      expect(r.width).toBeGreaterThanOrEqual(0)
    }
  })

  it("keeps all rects inside the box and non-negative for normal values", () => {
    const rects = barRects([0, 5, 10, 2], 10, box)
    expect(rects).toHaveLength(4)
    const baseline = 80
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(30)
      expect(r.x + r.width).toBeLessThanOrEqual(190.0001)
      expect(r.y).toBeGreaterThanOrEqual(10 - 0.0001)
      expect(r.y).toBeLessThanOrEqual(baseline + 0.0001)
      expect(r.height).toBeGreaterThanOrEqual(0)
      expect(r.width).toBeGreaterThanOrEqual(0)
      expect(Math.abs(r.y + r.height - baseline)).toBeLessThan(0.001)
    }
    expect(rects[0]!.height).toBe(0)
    expect(rects[2]!.height).toBeCloseTo(70, 5)
  })
})

describe("sliceDayWindow", () => {
  const pts90 = Array.from({ length: 90 }, (_, i) => ({ day: `2026-01-${String(i + 1).padStart(2, "0")}` }))

  it("returns last 30 days for len 90 offset 0", () => {
    const out = sliceDayWindow(pts90, 0)
    expect(out).toHaveLength(30)
    expect(out[0]).toEqual({ day: "2026-01-61" })
    expect(out[29]).toEqual({ day: "2026-01-90" })
  })

  it("returns first 30 days for len 90 offset 60", () => {
    const out = sliceDayWindow(pts90, 60)
    expect(out).toHaveLength(30)
    expect(out[0]).toEqual({ day: "2026-01-01" })
    expect(out[29]).toEqual({ day: "2026-01-30" })
  })

  it("clamps offset at max and below 0", () => {
    const atMax = sliceDayWindow(pts90, 999)
    expect(atMax[0]).toEqual({ day: "2026-01-01" })
    expect(atMax).toHaveLength(30)
    const belowZero = sliceDayWindow(pts90, -5)
    expect(belowZero[0]).toEqual({ day: "2026-01-61" })
    expect(belowZero).toHaveLength(30)
  })

  it("returns whole array when len < 30", () => {
    const small = [{ day: "a" }, { day: "b" }, { day: "c" }]
    const out = sliceDayWindow(small, 0)
    expect(out).toEqual(small)
    expect(out).not.toBe(small)
  })

  it("returns [] for empty input", () => {
    expect(sliceDayWindow([], 0)).toEqual([])
  })

  it("does not mutate input", () => {
    const copy = [...pts90]
    sliceDayWindow(pts90, 10)
    expect(pts90).toEqual(copy)
  })
})

describe("dayTicks", () => {
  it("returns 30 entries with step 3 labels and MM-DD formatting", () => {
    const ticks = dayTicks("2026-08-01", 30)
    expect(ticks).toHaveLength(30)
    expect(ticks.filter((t) => t.label !== null)).toHaveLength(10)
    expect(ticks.map((t) => t.index)).toEqual(Array.from({ length: 30 }, (_, i) => i))
    for (let i = 0; i < 30; i++) {
      if (i % 3 === 0) expect(ticks[i]!.label).not.toBeNull()
      else expect(ticks[i]!.label).toBeNull()
    }
    expect(ticks[0]!.label).toBe("08-01")
    expect(ticks[3]!.label).toBe("08-04")
    expect(ticks[27]!.label).toBe("08-28")
  })

  it("uses UTC arithmetic across month rollover", () => {
    const ticks = dayTicks("2026-02-27", 4)
    expect(ticks.map((t) => t.label)).toEqual(["02-27", "02-28", "03-01", "03-02"])
  })

  it("returns [] for invalid or empty startDay", () => {
    expect(dayTicks("", 30)).toEqual([])
    expect(dayTicks("bad", 30)).toEqual([])
  })
})



describe("paddedExtent", () => {
  it("pads min/max proportionally (range / 6) so data spans ~75% of the plot", () => {
    // range 90, pad 15
    expect(paddedExtent([5410, 5430, 5500])).toEqual({ min: 5395, max: 5515 })
  })

  it("uses the flat-line fallback pad when all finite values are equal", () => {
    expect(paddedExtent([5, 5])).toEqual({ min: -95, max: 105 })
  })

  it("ignores null/undefined/non-finite values", () => {
    // range 100, pad 100/6
    const result = paddedExtent([null, undefined, 200, 100])
    expect(result).not.toBeNull()
    expect(result!.min).toBeCloseTo(100 - 100 / 6, 5)
    expect(result!.max).toBeCloseTo(200 + 100 / 6, 5)
  })

  it("returns null when no finite value is present", () => {
    expect(paddedExtent([])).toBeNull()
    expect(paddedExtent([null, undefined])).toBeNull()
  })

  it("handles negative values", () => {
    // range 40, pad 40/6
    const result = paddedExtent([-50, -10])
    expect(result).not.toBeNull()
    expect(result!.min).toBeCloseTo(-50 - 40 / 6, 5)
    expect(result!.max).toBeCloseTo(-10 + 40 / 6, 5)
  })

  it("accepts an explicit flat pad override", () => {
    expect(paddedExtent([1000, 1200], 50)).toEqual({ min: 950, max: 1250 })
  })
})

describe("buildLiveGrid", () => {
  const windowStartMs = Date.UTC(2026, 0, 1, 0, 0, 0, 0)

  it("maps 8 observations at 3-hour offsets in one day to the first 8 slots in order", () => {
    const points: P2pPriceLike[] = Array.from({ length: 8 }, (_, i) => ({
      day: "2026-01-01",
      hour: i * 3,
      egpPerUsdtMinor: (i + 1) * 100,
      minEgpPerUsdtMinor: (i + 1) * 100 - 10,
      avgEgpPerUsdtMinor: (i + 1) * 100,
      maxEgpPerUsdtMinor: (i + 1) * 100 + 10,
    }))
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out).toHaveLength(8)
    for (let i = 0; i < 8; i++) {
      expect(out[i]!.day).toBe("2026-01-01")
      expect(out[i]!.hour).toBe(i * 3)
      expect(out[i]!.t).toBe(Date.UTC(2026, 0, 1, i * 3))
      expect(out[i]!.liveMin).toBeCloseTo((i + 1) - 0.1, 5)
      expect(out[i]!.liveAvg).toBeCloseTo(i + 1, 5)
      expect(out[i]!.liveMax).toBeCloseTo((i + 1) + 0.1, 5)
    }
  })

  it("two observations in the same slot: last wins", () => {
    const points: P2pPriceLike[] = [
      { day: "2026-01-01", hour: 0, egpPerUsdtMinor: 100, avgEgpPerUsdtMinor: 100 },
      { day: "2026-01-01", hour: 1, egpPerUsdtMinor: 200, avgEgpPerUsdtMinor: 200 },
    ]
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out[0]!.liveAvg).toBeCloseTo(2, 5)
  })

  it("6-hour gaps: empty 3-hour slots carry forward", () => {
    const points: P2pPriceLike[] = [
      { day: "2026-01-01", hour: 0, egpPerUsdtMinor: 100 },
      { day: "2026-01-01", hour: 6, egpPerUsdtMinor: 200 },
    ]
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out[0]!.liveAvg).toBeCloseTo(1, 5)
    expect(out[1]!.liveAvg).toBeCloseTo(1, 5) // carried from 00:00
    expect(out[1]!.liveMin).toBeCloseTo(1, 5)
    expect(out[1]!.liveMax).toBeCloseTo(1, 5)
    expect(out[2]!.liveAvg).toBeCloseTo(2, 5)
  })

  it("legacy hour: null point lands in the day's last slot (21:00)", () => {
    const points: P2pPriceLike[] = [{ day: "2026-01-01", hour: null, egpPerUsdtMinor: 500 }]
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out[7]!.hour).toBe(21)
    expect(out[7]!.liveAvg).toBeCloseTo(5, 5)
    expect(out[0]!.liveAvg).toBeUndefined()
  })

  it("leading slots before the first observation have liveMin/liveAvg/liveMax undefined", () => {
    const points: P2pPriceLike[] = [{ day: "2026-01-01", hour: 6, egpPerUsdtMinor: 300 }]
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out[0]!.liveMin).toBeUndefined()
    expect(out[0]!.liveAvg).toBeUndefined()
    expect(out[0]!.liveMax).toBeUndefined()
    expect(out[1]!.liveAvg).toBeUndefined()
    expect(out[2]!.liveAvg).toBeCloseTo(3, 5)
  })

  it("ignores a point before windowStartMs and one after the window end", () => {
    const points: P2pPriceLike[] = [
      { day: "2025-12-31", hour: 21, egpPerUsdtMinor: 100 },
      { day: "2026-01-01", hour: 0, egpPerUsdtMinor: 200 },
      { day: "2026-01-02", hour: 0, egpPerUsdtMinor: 300 },
    ]
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out).toHaveLength(8)
    expect(out[0]!.liveAvg).toBeCloseTo(2, 5)
    expect(out.every((s) => s.liveAvg !== 1 && s.liveAvg !== 3)).toBe(true)
  })

  it("output length is exactly windowDays * 8", () => {
    expect(buildLiveGrid([], windowStartMs, 30)).toHaveLength(240)
    expect(buildLiveGrid([], windowStartMs, 7)).toHaveLength(56)
  })

  it("carry-through reaches the final slot", () => {
    const points: P2pPriceLike[] = [{ day: "2026-01-01", hour: 0, egpPerUsdtMinor: 777 }]
    const out = buildLiveGrid(points, windowStartMs, 2)
    expect(out).toHaveLength(16)
    for (let i = 0; i < 16; i++) {
      expect(out[i]!.liveAvg).toBeCloseTo(7.77, 5)
      expect(out[i]!.liveMin).toBeCloseTo(7.77, 5)
      expect(out[i]!.liveMax).toBeCloseTo(7.77, 5)
    }
  })

  it("uses fallback price fields and does not mutate input", () => {
    const points: P2pPriceLike[] = [{ day: "2026-01-01", hour: 0, egpPerUsdtMinor: 1234 }]
    const copy = JSON.parse(JSON.stringify(points))
    const out = buildLiveGrid(points, windowStartMs, 1)
    expect(out[0]!.liveMin).toBeCloseTo(12.34, 5)
    expect(out[0]!.liveAvg).toBeCloseTo(12.34, 5)
    expect(out[0]!.liveMax).toBeCloseTo(12.34, 5)
    expect(points).toEqual(copy)
  })
})

describe("yAxisTicks", () => {
  it("includes exact bounds, is ascending/unique, length >= 4, all within range", () => {
    const ticks = yAxisTicks(0, 100, 6)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBe(100)
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(100)
    }
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!)
    }
    expect(new Set(ticks.map((t) => t.toFixed(9))).size).toBe(ticks.length)
  })

  it("includes exact padded bounds for a tight data extent", () => {
    const ticks = yAxisTicks(5395, 5515, 6)
    expect(ticks[0]).toBe(5395)
    expect(ticks[ticks.length - 1]).toBe(5515)
  })

  it("returns a single value for a degenerate range", () => {
    expect(yAxisTicks(5, 5, 6)).toEqual([5])
    expect(yAxisTicks(5, 4, 6)).toEqual([5])
  })

  it("returns [] for invalid bounds", () => {
    expect(yAxisTicks(Number.NaN, 1, 6)).toEqual([])
    expect(yAxisTicks(1, Infinity, 6)).toEqual([])
  })

  it("falls back to evenly spaced interior grades for a tight range", () => {
    const ticks = yAxisTicks(5, 5.01, 4)
    expect(ticks[0]).toBe(5)
    expect(ticks[ticks.length - 1]).toBe(5.01)
    expect(ticks.length).toBeGreaterThanOrEqual(4) // bounds plus evenly spaced intermediates
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!)
    }
  })
})

describe("bufferViewport", () => {
  it("daily, windowDays 30, offset 0, bufferDays 90", () => {
    const v = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 0,
      bufferDays: 90,
      bufferCount: 90,
      visibleCount: 30,
      slotsPerDay: 1,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(v.bufferSpan).toBe(1884)
    expect(v.bufferLeft).toBe(-1182)
    expect(v.tx).toBe(0)
  })

  it("daily, same window, offset 30", () => {
    const v = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 30,
      bufferDays: 90,
      bufferCount: 90,
      visibleCount: 30,
      slotsPerDay: 1,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(v.tx).toBe(628)
  })

  it("live, offset 0, bufferDays 90, bufferCount 720, visibleCount 240, slotsPerDay 8", () => {
    const v = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 0,
      bufferDays: 90,
      bufferCount: 720,
      visibleCount: 240,
      slotsPerDay: 8,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(v.tx).toBe(0)
  })

  it("live, offset 30", () => {
    const v = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 30,
      bufferDays: 90,
      bufferCount: 720,
      visibleCount: 240,
      slotsPerDay: 8,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(v.tx).toBe(628)
  })

  it("partial buffer at the oldest edge", () => {
    const v = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 60,
      bufferDays: 60,
      bufferCount: 60,
      visibleCount: 30,
      slotsPerDay: 1,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(v.bufferSpan).toBe(1256)
    expect(v.bufferLeft).toBe(-554)
    expect(v.tx).toBe(628)
  })

  it("degenerate: bufferCount 0 and non-finite input return finite fallbacks", () => {
    const zero = bufferViewport({
      windowDays: 30,
      windowOffsetDays: 0,
      bufferDays: 90,
      bufferCount: 0,
      visibleCount: 30,
      slotsPerDay: 1,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(zero.bufferLeft).toBe(74)
    expect(zero.bufferSpan).toBe(628)
    expect(zero.tx).toBe(0)
    for (const v of [zero.bufferLeft, zero.bufferSpan, zero.tx]) {
      expect(Number.isFinite(v)).toBe(true)
    }

    const nonFinite = bufferViewport({
      windowDays: 30,
      windowOffsetDays: Number.NaN,
      bufferDays: 90,
      bufferCount: 90,
      visibleCount: 30,
      slotsPerDay: 1,
      plotLeft: 74,
      plotWidth: 628,
    })
    expect(nonFinite.bufferLeft).toBe(74)
    expect(nonFinite.bufferSpan).toBe(628)
    expect(nonFinite.tx).toBe(0)
    for (const v of [nonFinite.bufferLeft, nonFinite.bufferSpan, nonFinite.tx]) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})
