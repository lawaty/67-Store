// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import TrendChart from "./trend-chart"

afterEach(() => cleanup())

function utcDays(startDay: string, count: number): string[] {
  const start = Date.parse(`${startDay}T00:00:00.000Z`)
  return Array.from({ length: count }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10))
}

function sampleProps() {
  // 90 valid calendar days so offset slicing and the 30-day fixed window are observable.
  const days = utcDays("2026-01-01", 90)
  const profit = days.map((day, i) => ({ day, marginUsdMinor: (i + 1) * 100 - 500 }))
  const p2p = days.map((day, i) => ({
    day,
    hour: `${day}T00:00:00.000Z`,
    egpPerUsdtMinor: 5100 + i * 5,
    minEgpPerUsdtMinor: 5000 + i * 5,
    avgEgpPerUsdtMinor: 5100 + i * 5,
    maxEgpPerUsdtMinor: 5200 + i * 5,
  }))
  const wac = days.map((day, i) => ({ day, wacEgpMinor: 4800 + i * 2 }))
  return { profit, p2p, wac }
}

function renderChart(overrides: Partial<React.ComponentProps<typeof TrendChart>> = {}) {
  return render(
    <TrendChart
      {...sampleProps()}
      windowOffsetDays={0}
      maxWindowOffsetDays={60}
      {...overrides}
    />,
  )
}



function containerText(container: HTMLElement): string {
  return container.textContent ?? ""
}

function xLabels(container: HTMLElement): string[] {
  const svg = container.querySelector('svg[role="img"]')!
  return Array.from(svg.querySelectorAll("text"))
    .map((t) => t.textContent?.trim() ?? "")
    .filter((t) => /^\d{2}-\d{2}$/.test(t))
}

function bufferGroup(container: HTMLElement): SVGGElement {
  return container.querySelector('[data-testid="trend-buffer"]') as SVGGElement
}

describe("TrendChart", () => {
  it("windowDays=7 renders 7 day gridlines (visible axis) and a 3-window (21-day) buffered live series with per-datapoint dots", () => {
    const { container } = renderChart({ windowDays: 7 })
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(7)
    // 3-window buffer => 21 days × 8 slots = 168 slots; all non-null in this fixture => 168 dots/series
    expect(svg.querySelectorAll('[data-series="live-min-point"]').length).toBe(168)
    expect(svg.querySelectorAll('[data-series="live-avg-point"]').length).toBe(168)
    expect(svg.querySelectorAll('[data-series="live-max-point"]').length).toBe(168)
    expect(svg.getAttribute("aria-label")).toContain("خلال نافذة 7 يوم")
  })

  it("windowDays=14 renders 14 day gridlines (visible axis) and a 3-window (42-day) buffered live series with per-datapoint dots", () => {
    const { container } = renderChart({ windowDays: 14 })
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(14)
    // 42 days × 8 slots = 336 slots; all non-null => 336 dots
    expect(svg.querySelectorAll('[data-series="live-avg-point"]').length).toBe(336)
  })

  it("default domain live-cost renders three curves and legend, no WAC/profit", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg).toBeTruthy()
    expect(svg.querySelector('[data-series="live-min"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="live-max"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="wac"]')).toBeNull()
    expect(svg.querySelector('[data-series="profit-bars"]')).toBeNull()
    expect(svg.querySelector('[data-series="profit-area"]')).toBeNull()
    const legend = container.querySelector('[data-testid="live-cost-legend"]')!
    expect(legend).toBeTruthy()
    expect(legend.textContent).toContain("الحد الأدنى")
    expect(legend.textContent).toContain("المتوسط")
    expect(legend.textContent).toContain("الحد الأعلى")
  })

  it("wraps buffered series in a clip with a translated trend-buffer group (3-window buffer contract)", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelector('#trend-plot-clip rect')).toBeTruthy()
    const group = bufferGroup(container)
    expect(group).toBeTruthy()
    expect(group.getAttribute("transform")).toMatch(/^translate\(/)
    expect(group.closest('[clip-path="url(#trend-plot-clip)"]')).toBeTruthy()
    expect(group.querySelector('[data-series="live-avg"]')).toBeTruthy()
    // visible axis (day grid) remains outside the translated buffer group
    expect(group.querySelector('[data-series="day-grid"]')).toBeNull()
    expect(svg.querySelector('[data-series="day-grid"]')).toBeTruthy()
  })

  it("legend order is max, then avg, then min", () => {
    const { container } = renderChart()
    const items = Array.from(container.querySelectorAll('[data-testid^="live-cost-legend-"]')).map(
      (el) => el.getAttribute("data-testid"),
    )
    expect(items).toEqual([
      "live-cost-legend-live-max",
      "live-cost-legend-live-avg",
      "live-cost-legend-live-min",
    ])
  })

  it("toggling a legend button hides/shows that curve and updates aria-pressed", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    const maxBtn = container.querySelector('[data-testid="live-cost-legend-live-max"]') as HTMLButtonElement
    expect(maxBtn.tagName).toBe("BUTTON")
    expect(maxBtn.getAttribute("type")).toBe("button")
    expect(maxBtn.getAttribute("aria-pressed")).toBe("true")
    expect(svg.querySelector('[data-series="live-max"]')).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="live-max-point"]').length).toBeGreaterThan(0)

    fireEvent.click(maxBtn)
    expect(maxBtn.getAttribute("aria-pressed")).toBe("false")
    expect(svg.querySelector('[data-series="live-max"]')).toBeNull()
    expect(svg.querySelectorAll('[data-series="live-max-point"]')).toHaveLength(0)
    // other series remain
    expect(svg.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="live-min"]')).toBeTruthy()

    fireEvent.click(maxBtn)
    expect(maxBtn.getAttribute("aria-pressed")).toBe("true")
    expect(svg.querySelector('[data-series="live-max"]')).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="live-max-point"]').length).toBeGreaterThan(0)
  })

  it("tooltip omits hidden series row but keeps remaining rows", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    fireEvent.focus(svg)
    expect(container.textContent).toContain("الحد الأدنى:")
    expect(container.textContent).toContain("المتوسط:")
    expect(container.textContent).toContain("الحد الأعلى:")

    fireEvent.click(container.querySelector('[data-testid="live-cost-legend-live-max"]')!)
    // re-focus to ensure tooltip reflects current state
    fireEvent.blur(svg)
    fireEvent.focus(svg)
    expect(container.textContent).not.toContain("الحد الأعلى:")
    expect(container.textContent).toContain("الحد الأدنى:")
    expect(container.textContent).toContain("المتوسط:")
  })

  it("y-domain (over the buffer) tightens when max is hidden", () => {
    // max sits well above avg so the padded domain changes across the 3-window buffer.
    const days = utcDays("2026-01-01", 90)
    const profit = days.map((day, i) => ({ day, marginUsdMinor: (i + 1) * 100 - 500 }))
    const p2p = days.map((day) => ({
      day,
      hour: `${day}T00:00:00.000Z`,
      egpPerUsdtMinor: 5100,
      minEgpPerUsdtMinor: 5000,
      avgEgpPerUsdtMinor: 5100,
      maxEgpPerUsdtMinor: 6000,
    }))
    const { container } = renderChart({ profit, p2p, wac: [] })
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    const yTickTexts = () =>
      Array.from(svg.querySelectorAll("text"))
        .map((t) => t.textContent?.trim() ?? "")
        .filter((t) => /^\d+\.\d+$/.test(t))
        .map(Number)
    const beforeMax = Math.max(...yTickTexts())
    fireEvent.click(container.querySelector('[data-testid="live-cost-legend-live-max"]')!)
    const afterMax = Math.max(...yTickTexts())
    expect(afterMax).toBeLessThan(beforeMax)
  })

  it("renders at least 4 numeric y labels and draws the padded top bound above raw data max", () => {
    // Raw fixture max is 52.00 (5200 minor). Proportional pad (range/6) lifts the top bound,
    // so the maximum y label must exceed the raw data maximum.
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    const yTickTexts = Array.from(svg.querySelectorAll("text"))
      .map((t) => t.textContent?.trim() ?? "")
      .filter((t) => /^\d+\.\d+$/.test(t))
      .map(Number)
    expect(yTickTexts.length).toBeGreaterThanOrEqual(4)
    const rawMax = 52.0 // 5200 minor units formatted as 52.00
    expect(Math.max(...yTickTexts)).toBeGreaterThan(rawMax)
  })

  it("uses cubic curves and per-datapoint dots for all three buffered live-cost series (3-window buffer)", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    for (const series of ["live-min", "live-avg", "live-max"]) {
      const path = svg.querySelector(`[data-series="${series}"]`)
      expect(path).toBeTruthy()
      expect(path!.getAttribute("d")).toContain("C")
    }
    // 3-window buffer for 30-day window => 90 days × 8 slots = 720; all non-null in this fixture.
    expect(svg.querySelectorAll('[data-series="live-min-point"]').length).toBe(720)
    expect(svg.querySelectorAll('[data-series="live-avg-point"]').length).toBe(720)
    expect(svg.querySelectorAll('[data-series="live-max-point"]').length).toBe(720)
    expect(svg.querySelector('[data-series="live-min-point"]')?.getAttribute("r")).toBe("1.5")
    expect(svg.querySelector('[data-series="live-avg-point"]')?.getAttribute("r")).toBe("1.5")
    expect(svg.querySelector('[data-series="live-max-point"]')?.getAttribute("r")).toBe("1.5")
  })

  it("fixed window with 90-day fixture renders 30 day gridlines and MM-DD labels every 3rd day", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(30)
    const labels = xLabels(container)
    // 90 days from 2026-01-01 => last 30 are 2026-03-02..2026-03-31; label every 3rd day.
    expect(labels).toHaveLength(10)
    expect(labels[0]).toBe("03-02")
    expect(labels[1]).toBe("03-05")
    expect(labels[labels.length - 1]).toBe("03-29")
    for (const label of labels) expect(label).toMatch(/^\d{2}-\d{2}$/)
  })

  it("tooltip shows MM-DD HH:00 for a live point", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    fireEvent.focus(svg) // selects last point (last 3h slot of 2026-03-31)
    expect(container.textContent).toContain("03-31 21:00")
    expect(container.textContent).toContain("الحد الأدنى:")
    expect(container.textContent).toContain("المتوسط:")
    expect(container.textContent).toContain("الحد الأعلى:")
  })

  it("offset prop slices the window to older dates", () => {
    const { container } = renderChart({ windowOffsetDays: 30, maxWindowOffsetDays: 60 })
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(30)
    const labels = xLabels(container)
    expect(labels[0]).toBe("01-31")
    expect(labels).not.toContain("03-02")
    fireEvent.focus(svg)
    expect(container.textContent).toContain("03-01 21:00")
  })

  it("does not render above-chart sparsity notes and keeps the legend", () => {
    const sparseDays = ["2026-04-01", "2026-04-02"]
    const sparseProfit = sparseDays.map((day, i) => ({ day, marginUsdMinor: (i + 1) * 100 }))
    const sparseP2p = sparseDays.map((day, i) => ({
      day,
      hour: `${day}T00:00:00.000Z`,
      egpPerUsdtMinor: 5100 + i * 5,
      minEgpPerUsdtMinor: 5000 + i * 5,
      avgEgpPerUsdtMinor: 5100 + i * 5,
      maxEgpPerUsdtMinor: 5200 + i * 5,
    }))
    const sparseWac = sparseDays.map((day, i) => ({ day, wacEgpMinor: 4800 + i * 2 }))
    const { container: sparse, rerender } = render(
      <TrendChart
        profit={sparseProfit}
        p2p={sparseP2p}
        wac={sparseWac}
        windowOffsetDays={0}
        maxWindowOffsetDays={0}
      />,
    )
    expect(containerText(sparse)).not.toContain("المنحنى بيتشكل بعد 3 نقط من بيانات P2P")
    expect(containerText(sparse)).not.toContain("منحنيات الحد الأدنى والأعلى بتنظهر بعد 2 نقطة")
    expect(containerText(sparse)).not.toContain("الاتجاه")
    expect(sparse.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()
    expect(sparse.querySelectorAll('[data-testid^="live-cost-legend-live-"]')).toHaveLength(3)

    rerender(
      <TrendChart
        profit={sparseProfit}
        p2p={sparseP2p}
        wac={sparseWac}
        windowOffsetDays={0}
        maxWindowOffsetDays={0}
        domain="wac"
      />,
    )
    expect(sparse.querySelector('[data-testid="live-cost-legend"]')).toBeNull()
    rerender(
      <TrendChart
        profit={sparseProfit}
        p2p={sparseP2p}
        wac={sparseWac}
        windowOffsetDays={0}
        maxWindowOffsetDays={0}
        domain="profit"
      />,
    )
    expect(sparse.querySelector('[data-testid="live-cost-legend"]')).toBeNull()

    cleanup()
    const { container: full } = renderChart()
    expect(containerText(full)).not.toContain("المنحنى بيتشكل بعد 3 نقط من بيانات P2P")
    expect(containerText(full)).not.toContain("منحنيات الحد الأدنى والأعلى بتنظهر بعد 2 نقطة")
    expect(containerText(full)).not.toContain("الاتجاه")
    expect(full.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()
  })

  it("switching to wac renders only the WAC curve", () => {
    const { container } = renderChart({ domain: "wac" })
    const svg = container.querySelector('svg[role="img"][data-domain="wac"]')!
    expect(svg.querySelector('[data-series="wac"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="wac-point"]')?.getAttribute("r")).toBe("1.5")
    expect(svg.querySelector('[data-series="live-min"]')).toBeNull()
    expect(svg.querySelector('[data-series="live-avg"]')).toBeNull()
    expect(svg.querySelector('[data-series="live-max"]')).toBeNull()
    expect(svg.querySelector('[data-series="profit-bars"]')).toBeNull()
    expect(svg.querySelector('[data-series="profit-area"]')).toBeNull()
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeNull()
  })

  it("switching to profit renders bars; cumulative renders area (buffered 3-window series)", () => {
    const { container, rerender } = renderChart({ domain: "profit" })
    const svg = container.querySelector('svg[role="img"][data-domain="profit"]')!
    expect(svg.querySelector('[data-series="profit-bars"]')).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="profit-bars"]').length).toBe(90)
    expect(svg.querySelector('[data-series="profit-area"]')).toBeNull()
    expect(svg.querySelector('[data-series="live-min"]')).toBeNull()

    rerender(
      <TrendChart
        {...sampleProps()}
        windowOffsetDays={0}
        maxWindowOffsetDays={60}
        domain="profit"
        profitMode="cumulative"
      />,
    )
    expect(container.querySelector('[data-series="profit-area"]')).toBeTruthy()
    expect(container.querySelector('[data-series="profit-bars"]')).toBeNull()
  })

  it("old P2P points without min/max still render the average curve only", () => {
    const days = utcDays("2026-04-01", 10)
    const profit = days.map((day, i) => ({ day, marginUsdMinor: (i + 1) * 100 }))
    const p2p = days.map((day, i) => ({ day, hour: `${day}T00:00:00.000Z`, egpPerUsdtMinor: 5100 + i * 5 }))
    const wac = days.map((day, i) => ({ day, wacEgpMinor: 4800 + i * 2 }))
    const { container } = render(
      <TrendChart profit={profit} p2p={p2p} wac={wac} windowOffsetDays={0} maxWindowOffsetDays={0} />,
    )
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="live-min"]')).toBeNull()
    expect(svg.querySelector('[data-series="live-max"]')).toBeNull()
  })

  it("profit daily/cumulative toggle only affects the profit domain", () => {
    const { container, rerender } = renderChart({ domain: "profit", profitMode: "cumulative" })
    expect(container.querySelector('[data-series="profit-area"]')).toBeTruthy()

    rerender(
      <TrendChart
        {...sampleProps()}
        windowOffsetDays={0}
        maxWindowOffsetDays={60}
        domain="live-cost"
        profitMode="cumulative"
      />,
    )
    expect(container.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(container.querySelector('[data-series="profit-area"]')).toBeNull()
  })

  it("renders loading/empty states with no svg throw", () => {
    const { container: c1 } = render(
      <TrendChart p2p={[]} wac={[]} profit={[]} loading windowOffsetDays={0} maxWindowOffsetDays={0} />,
    )
    expect(c1.querySelector('svg[role="img"]')).toBeNull()
    expect(c1.querySelectorAll(".skeleton").length).toBeGreaterThanOrEqual(1)
    expect(Array.from(c1.querySelectorAll("button")).map((b) => b.textContent?.trim())).not.toContain("٧")
    expect(Array.from(c1.querySelectorAll("button")).map((b) => b.textContent?.trim())).not.toContain("٣٠")

    cleanup()
    const { container: c2 } = render(
      <TrendChart p2p={[]} wac={[]} profit={[]} windowOffsetDays={0} maxWindowOffsetDays={0} />,
    )
    expect(c2.querySelector('svg[role="img"]')).toBeNull()
    expect(c2.textContent).toContain("مفيش بيانات كافية للمجال ده.")
    expect(c2.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()
    expect(c2.querySelectorAll('[data-testid^="live-cost-legend-live-"]')).toHaveLength(3)
  })

  it("keeps filters and axes visible and shows in-plot note when the selected domain has no data in the window", () => {
    const { profit, p2p } = sampleProps()
    const { container, rerender } = render(
      <TrendChart
        profit={profit}
        p2p={p2p}
        wac={[]}
        windowOffsetDays={0}
        maxWindowOffsetDays={60}
        windowStartDay="2026-03-02"
        domain="wac"
      />,
    )
    expect(container.querySelector('svg[role="img"]')).toBeTruthy()

    // SVG/axes/grid remain; whole-chart placeholder is not used.
    const svg = container.querySelector('svg[role="img"]')!
    expect(svg).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(30)
    expect(svg.querySelector('[data-series="wac"]')).toBeNull()
    expect(svg.querySelector('[data-testid="empty-domain-note"]')?.textContent).toContain(
      "مفيش بيانات كافية للمجال ده.",
    )
    expect(container.querySelector('[aria-disabled="true"]')).toBeNull()

    rerender(
      <TrendChart
        profit={profit}
        p2p={p2p}
        wac={[]}
        windowOffsetDays={0}
        maxWindowOffsetDays={60}
        windowStartDay="2026-03-02"
        domain="live-cost"
      />,
    )
    expect(container.querySelector('svg[role="img"] [data-series="live-avg"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="empty-domain-note"]')).toBeNull()
  })

  it("panning to a region with no P2P observations still renders axes/grid, legend, and in-plot note", () => {
    const days = utcDays("2026-01-01", 90)
    const profit = days.map((day, i) => ({ day, marginUsdMinor: (i + 1) * 100 }))
    // P2P only in the newest window (last 30 days of the 90-day series).
    const p2p = days.slice(-30).map((day, i) => ({
      day,
      hour: `${day}T00:00:00.000Z`,
      egpPerUsdtMinor: 5100 + i,
      minEgpPerUsdtMinor: 5000 + i,
      avgEgpPerUsdtMinor: 5100 + i,
      maxEgpPerUsdtMinor: 5200 + i,
    }))
    const { container } = render(
      <TrendChart
        p2p={p2p}
        wac={[]}
        profit={profit}
        windowOffsetDays={60}
        maxWindowOffsetDays={60}
        windowStartDay="2026-01-01"
      />,
    )
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(30)
    // y gridlines/ticks present
    expect(svg.querySelectorAll('line[x2]').length).toBeGreaterThan(30)
    expect(svg.querySelector('[data-series="live-avg"]')).toBeNull()
    expect(svg.querySelector('[data-testid="empty-domain-note"]')?.textContent).toContain(
      "مفيش بيانات كافية للمجال ده.",
    )
    expect(container.querySelector('[aria-disabled="true"]')).toBeNull()
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-testid^="live-cost-legend-live-"]')).toHaveLength(3)
  })

  it("renders the buffered live grid (3 windows) while keeping the visible 30-day axis/grid", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.getAttribute("aria-label")).toContain("بنقاط كل 3 ساعات")
    // Buffered series span 3 windows (90 days × 8 slots = 720 datapoints); visible axis remains 30 days.
    expect(svg.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(svg.querySelectorAll('[data-series="live-avg-point"]').length).toBe(720)
    expect(svg.querySelectorAll('[data-series="day-grid"]')).toHaveLength(30)
  })

  it("renders current P2P overlay on live-cost when currentP2pMinor is provided", () => {
    const { container } = renderChart({ currentP2pMinor: 5400 })
    const svg = container.querySelector('svg[role="img"][data-domain="live-cost"]')!
    expect(svg.querySelector('[data-series="live-current"]')).toBeTruthy()
    expect(container.textContent).toContain("الحالي")
  })

  it("does not render current P2P overlay when currentP2pMinor is absent or null", () => {
    const { container } = renderChart()
    expect(container.querySelector('[data-series="live-current"]')).toBeNull()

    cleanup()
    const { container: c2 } = renderChart({ currentP2pMinor: null })
    expect(c2.querySelector('[data-series="live-current"]')).toBeNull()
  })
})


function mockSvgRect(svg: SVGSVGElement, width = 720) {
  // jsdom returns zero rects; mock for pointer/viewBox conversion.
  svg.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: width,
    bottom: 340,
    width,
    height: 340,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  // pointer capture APIs may be missing in jsdom
  if (!svg.setPointerCapture) (svg as any).setPointerCapture = vi.fn()
  if (!svg.releasePointerCapture) (svg as any).releasePointerCapture = vi.fn()
  if (!svg.hasPointerCapture) (svg as any).hasPointerCapture = () => false
}

function dayWidthPx(svgWidth = 720) {
  // CHART_PLOT_WIDTH = 628, 30 days, scaled to svg pixel width
  return (628 / 30) * (svgWidth / 720)
}

describe("TrendChart panning interaction", () => {
  it("pointerMove translates the buffer in the DOM without calling onWindowOffsetChange; pointerUp commits once", () => {
    const onWindowOffsetChange = vi.fn()
    const { container } = renderChart({ windowOffsetDays: 5, onWindowOffsetChange })
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    mockSvgRect(svg)
    const group = bufferGroup(container)
    const axis = container.querySelector('[data-testid="trend-axis"]') as SVGGElement
    const before = group.getAttribute("transform")
    const axisBefore = axis.getAttribute("transform")

    const step = dayWidthPx() + 0.5
    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 100 + step })
    expect(group.getAttribute("transform")).not.toBe(before)
    expect(axis.getAttribute("transform")).not.toBe(axisBefore)
    expect(axis.getAttribute("transform")).toMatch(/^translate\([^0,][^,]*,\s*0\)$/)
    expect(onWindowOffsetChange).not.toHaveBeenCalled()

    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 100 + step * 1.5 })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()

    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 100 + step * 1.5 })
    expect(onWindowOffsetChange).toHaveBeenCalledTimes(1)
    expect(onWindowOffsetChange.mock.calls[0]?.[0]).toBeGreaterThan(5)
  })

  it("drag right by ~1 day commits larger offset on pointerUp; drag left clamps at 0; sub-day drag does not commit and resets transform", () => {
    const onWindowOffsetChange = vi.fn()
    const { container } = renderChart({ windowOffsetDays: 5, onWindowOffsetChange })
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    mockSvgRect(svg)
    const group = bufferGroup(container)

    const step = dayWidthPx() + 0.5
    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 100 + step })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 100 + step })
    expect(onWindowOffsetChange).toHaveBeenCalled()
    const last = onWindowOffsetChange.mock.calls.at(-1)?.[0] as number
    expect(last).toBeGreaterThan(5)

    onWindowOffsetChange.mockClear()
    fireEvent.pointerDown(svg, { pointerId: 2, button: 0, clientX: 200 })
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 200 - 300 })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 200 - 300 })
    expect(onWindowOffsetChange).toHaveBeenCalledWith(0)

    onWindowOffsetChange.mockClear()
    const before = group.getAttribute("transform")
    fireEvent.pointerDown(svg, { pointerId: 3, button: 0, clientX: 150 })
    fireEvent.pointerMove(svg, { pointerId: 3, clientX: 150 + 3 }) // sub-day, below 5 viewBox threshold
    fireEvent.pointerUp(svg, { pointerId: 3, clientX: 150 + 3 })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
    expect(group.getAttribute("transform")).toBe(before)
  })

  it("drag commits once and clamps at both ends on pointerUp", () => {
    const onWindowOffsetChange = vi.fn()
    const { container, rerender } = renderChart({
      windowOffsetDays: 58,
      maxWindowOffsetDays: 60,
      onWindowOffsetChange,
    })
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    mockSvgRect(svg)
    const step = dayWidthPx() * 10
    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 100 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 100 + step })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 100 + step })
    expect(onWindowOffsetChange).toHaveBeenCalledTimes(1)
    expect(onWindowOffsetChange).toHaveBeenCalledWith(60)

    onWindowOffsetChange.mockClear()
    rerender(
      <TrendChart
        {...sampleProps()}
        windowOffsetDays={1}
        maxWindowOffsetDays={60}
        onWindowOffsetChange={onWindowOffsetChange}
      />,
    )
    const svg2 = container.querySelector('svg[role="img"]') as SVGSVGElement
    mockSvgRect(svg2)
    fireEvent.pointerDown(svg2, { pointerId: 2, button: 0, clientX: 200 })
    fireEvent.pointerMove(svg2, { pointerId: 2, clientX: 200 - step })
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(svg2, { pointerId: 2, clientX: 200 - step })
    expect(onWindowOffsetChange).toHaveBeenCalledTimes(1)
    expect(onWindowOffsetChange).toHaveBeenCalledWith(0)
  })

  it("keyboard moves window with clamped offsets and preventDefault", () => {
    const onWindowOffsetChange = vi.fn()
    const { container } = renderChart({
      windowOffsetDays: 10,
      maxWindowOffsetDays: 60,
      onWindowOffsetChange,
    })
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement

    const cases: Array<[string, boolean, number]> = [
      ["ArrowLeft", false, 11],
      ["ArrowRight", false, 9],
      ["ArrowLeft", true, 17],
      ["ArrowRight", true, 3],
      ["Home", false, 60],
      ["End", false, 0],
    ]
    for (const [key, shiftKey, expected] of cases) {
      onWindowOffsetChange.mockClear()
      const ev = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true })
      const prevented = !svg.dispatchEvent(ev) || ev.defaultPrevented
      expect(prevented).toBe(true)
      expect(onWindowOffsetChange).toHaveBeenCalledWith(expected)
    }
  })

  it("keyboard clamps at bounds", () => {
    const onWindowOffsetChange = vi.fn()
    const { container, rerender } = renderChart({
      windowOffsetDays: 0,
      maxWindowOffsetDays: 60,
      onWindowOffsetChange,
    })
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    fireEvent.keyDown(svg, { key: "ArrowRight" }) // already newest; clamped to 0
    // handled key still prevents default; offset does not change
    expect(onWindowOffsetChange).not.toHaveBeenCalled()

    rerender(
      <TrendChart
        {...sampleProps()}
        windowOffsetDays={60}
        maxWindowOffsetDays={60}
        onWindowOffsetChange={onWindowOffsetChange}
      />,
    )
    const svg2 = container.querySelector('svg[role="img"]') as SVGSVGElement
    fireEvent.keyDown(svg2, { key: "ArrowLeft" }) // already oldest; clamped to max
    expect(onWindowOffsetChange).not.toHaveBeenCalled()
  })

  it("SVG has chart-svg class (touch-action via CSS) and aria-label with dates and arrow-key hint", () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(svg.classList.contains("chart-svg")).toBe(true)
    const label = svg.getAttribute("aria-label") ?? ""
    expect(label).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(label).toContain("إلى")
    expect(label).toContain("مفاتيح الأسهم")
  })

  it("resets hover when windowOffsetDays changes", () => {
    const { container, rerender } = renderChart({ windowOffsetDays: 0 })
    const svg = () => container.querySelector('svg[role="img"]') as SVGSVGElement
    fireEvent.focus(svg())
    expect(container.textContent).toContain("03-31 21:00")

    rerender(
      <TrendChart {...sampleProps()} windowOffsetDays={30} maxWindowOffsetDays={60} />,
    )
    // hover was reset by window change; tooltip for old index gone (no focus re-fired)
    expect(container.textContent).not.toContain("03-31 21:00")
  })
})
