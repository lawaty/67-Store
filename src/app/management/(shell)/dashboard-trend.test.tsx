// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import DashboardTrend from "./dashboard-trend"

afterEach(() => cleanup())

function sampleSeries() {
  const days = Array.from({ length: 40 }, (_, i) => `2026-04-${String(i + 1).padStart(2, "0")}`)
  return days.map((day, i) => ({
    day,
    ordersCount: i + 1,
    revenueUsdMinor: (i + 1) * 1000,
    marginUsdMinor: (i + 1) * 100,
    coinsSold: (i + 1) * 2,
  }))
}

function sampleProjections() {
  return [
    {
      clientId: "client-12345678",
      email: "a@example.com",
      coinsConsumed30d: 50,
      markupBasisPoints: 1200,
      expectedMarkupBasisPoints7d: 1300,
      expectedMarkupBasisPoints30d: 1400,
      expectedProfit7Minor: 700,
      expectedProfit30Minor: 3000,
    },
    {
      clientId: "guest-87654321",
      email: null,
      coinsConsumed30d: 10,
      markupBasisPoints: 900,
      expectedMarkupBasisPoints7d: 950,
      expectedMarkupBasisPoints30d: 1000,
      expectedProfit7Minor: 100,
      expectedProfit30Minor: 400,
    },
  ]
}

describe("DashboardTrend", () => {
  it("aggregates totals for the default 30-day window (offset 0)", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
      />,
    )
    // last 30 days: days index 10..39 (1-based 11..40), orders sum 11+...+40 = (11+40)*30/2=765
    expect(container.textContent).toContain("765")
    // coins sold sum (i+1)*2 for i=10..39 = 2*765=1530
    expect(container.textContent).toContain("1530")
  })

  it("renders window date readout, latest button, and width chips with default 30", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
      />,
    )
    const section = container.querySelector('section[aria-label="الأداء والتوقعات"]')!
    expect(section).toBeTruthy()
    expect(container.querySelector('[aria-label="النطاق الزمني"]')).toBeNull()

    for (const id of ["window-width-7", "window-width-14", "window-width-30"]) {
      expect(container.querySelector(`[data-testid="${id}"]`)).toBeTruthy()
    }
    const chip30 = container.querySelector('[data-testid="window-width-30"]') as HTMLButtonElement
    const chip7 = container.querySelector('[data-testid="window-width-7"]') as HTMLButtonElement
    expect(chip30.getAttribute("aria-pressed")).toBe("true")
    expect(chip7.getAttribute("aria-pressed")).toBe("false")

    const readout = container.querySelector('[data-testid="window-range"]')!
    expect(readout.textContent).toBe("2026-04-11 ↔ 2026-04-40")

    const latest = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "الأحدث",
    ) as HTMLButtonElement
    expect(latest).toBeTruthy()
    expect(latest.disabled).toBe(true)

    const domainSelect = container.querySelector('select[aria-label="مجال الرسم البياني"]') as HTMLSelectElement
    expect(domainSelect).toBeTruthy()
    expect(domainSelect.value).toBe("live-cost")
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "يومي")).toBe(false)
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "تراكمي")).toBe(false)
  })

  it("recomputes totals for a non-zero offset (older window)", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
        windowOffsetDays={10}
      />,
    )
    // offset 10 from 40 days => window is days 1..30 (indices 0..29): orders 1+...+30 = 465
    expect(container.textContent).toContain("465")
    expect(container.textContent).not.toContain("765")
    expect(container.querySelector('[data-testid="window-range"]')!.textContent).toBe(
      "2026-04-01 ↔ 2026-04-30",
    )
    const latest = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "الأحدث",
    ) as HTMLButtonElement
    expect(latest.disabled).toBe(false)
  })

  it("clicking width chips changes the readout/totals and re-clamps the offset", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
        windowOffsetDays={10}
      />,
    )
    // 30-day window at offset 10 shows 465 orders over 01-30
    expect(container.textContent).toContain("465")
    expect(container.querySelector('[data-testid="window-range"]')!.textContent).toBe(
      "2026-04-01 ↔ 2026-04-30",
    )

    const chip14 = container.querySelector('[data-testid="window-width-14"]') as HTMLButtonElement
    fireEvent.click(chip14)
    expect(chip14.getAttribute("aria-pressed")).toBe("true")
    expect((container.querySelector('[data-testid="window-width-30"]') as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false")
    // 14-day window, offset re-clamped to min(10, 40-14=26)=10 => days 17..30 (indices 16..29): 17+...+30 = 329
    expect(container.querySelector('[data-testid="window-range"]')!.textContent).toBe(
      "2026-04-17 ↔ 2026-04-30",
    )
    expect(container.textContent).toContain("329")
    expect(container.textContent).not.toContain("465")

    const chip7 = container.querySelector('[data-testid="window-width-7"]') as HTMLButtonElement
    fireEvent.click(chip7)
    // 7-day window, offset still 10 clamped to 33 => days 24..30 (24+...+30)=189
    expect(container.querySelector('[data-testid="window-range"]')!.textContent).toBe(
      "2026-04-24 ↔ 2026-04-30",
    )
    expect(container.textContent).toContain("189")

    // offset beyond new max re-clamps to 0-equivalent newest for tiny series behavior:
    // simulate by going to 30 and widening? use a narrow scenario
  })

  it("re-clamps offset to 0 when width becomes larger than remaining room", () => {
    // 10 days of data: at width 7, maxOffset=3; set offset via latest then pan not exposed,
    // but controlled offset=3 with width default 30 clamps? easier: render controlled at 3 with 10 rows
    // and switch to width that makes maxOffset < 3? width 7 => max 3, so offset 3 stays; width 14 impossible if only 10
    // Better: 20 rows, controlled offset 10 (valid for width 7? max 13). Click 14 => max 6, offset clamps to 6.
    const series = Array.from({ length: 20 }, (_, i) => ({
      day: `2026-04-${String(i + 1).padStart(2, "0")}`,
      ordersCount: 1,
      revenueUsdMinor: 100,
      marginUsdMinor: 10,
      coinsSold: 1,
    }))
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
        windowOffsetDays={10}
      />,
    )
    fireEvent.click(container.querySelector('[data-testid="window-width-14"]') as HTMLButtonElement)
    // maxOffset for 14 with 20 rows = 6, so window should end at 20-6=14 => 01..14
    expect(container.querySelector('[data-testid="window-range"]')!.textContent).toBe(
      "2026-04-01 ↔ 2026-04-14",
    )
  })

  it("renders projection rows with guest fallback and formatted markup/profit", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={sampleProjections()}
      />,
    )
    expect(container.textContent).toContain("a@example.com")
    expect(container.textContent).toContain("عميل ضيف")
    expect(container.textContent).toContain("client-1")
    expect(container.textContent).toContain("12.00%")
    expect(container.textContent).toContain("7.00")
  })

  it("renders the section header above the full-width chart and performance card (in DOM order)", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
      />,
    )
    const section = container.querySelector('section[aria-label="الأداء والتوقعات"]')!
    expect(section).toBeTruthy()
    const header = section.firstElementChild!
    expect(header.textContent).toContain("الأداء + التوقعات")
    expect(header.querySelector('[data-testid="window-range"]')).toBeTruthy()
    expect(header.querySelector('select[aria-label="مجال الرسم البياني"]')).toBeTruthy()
    expect(header.querySelector('[role="group"][aria-label="عرض النافذة"]')).toBeTruthy()
    expect(Array.from(header.querySelectorAll("button")).some((b) => b.textContent?.trim() === "الأحدث")).toBe(true)

    expect(section.querySelector(".xl\\:grid-cols-2")).toBeNull()

    const chart = container.querySelector("article.chart-card")
    const performanceCard = Array.from(section.querySelectorAll("article.card")).find((el) =>
      el.textContent?.includes("إجماليات النافذة"),
    )
    expect(chart).toBeTruthy()
    expect(performanceCard).toBeTruthy()
    expect(header.compareDocumentPosition(chart!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(chart!.compareDocumentPosition(performanceCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("toolbar domain select and profit-mode toggle drive the chart", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={series.map((s) => ({
          day: s.day,
          hour: `${s.day}T00:00:00.000Z`,
          egpPerUsdtMinor: 5100,
          minEgpPerUsdtMinor: 5000,
          avgEgpPerUsdtMinor: 5100,
          maxEgpPerUsdtMinor: 5200,
        }))}
        wac={series.map((s) => ({ day: s.day, wacEgpMinor: 4800 }))}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
      />,
    )
    const select = container.querySelector('select[aria-label="مجال الرسم البياني"]') as HTMLSelectElement
    expect(select.value).toBe("live-cost")
    let svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(svg.getAttribute("data-domain")).toBe("live-cost")
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()

    fireEvent.change(select, { target: { value: "profit" } })
    svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "يومي")).toBe(true)
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "تراكمي")).toBe(true)
    expect(svg.querySelector('[data-series="profit-bars"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeNull()

    fireEvent.click(
      Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === "تراكمي") as HTMLButtonElement,
    )
    svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(svg.querySelector('[data-series="profit-area"]')).toBeTruthy()
    expect(svg.querySelector('[data-series="profit-bars"]')).toBeNull()

    fireEvent.change(select, { target: { value: "wac" } })
    svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "يومي")).toBe(false)
    expect(Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "تراكمي")).toBe(false)
    expect(svg.getAttribute("data-domain")).toBe("wac")
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeNull()

    fireEvent.change(select, { target: { value: "live-cost" } })
    svg = container.querySelector('svg[role="img"]') as SVGSVGElement
    expect(svg.querySelector('[data-series="live-avg"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="live-cost-legend"]')).toBeTruthy()
  })

  it("renders a link to the VIP levels page and no base-markup or VIP-curve controls", () => {
    const series = sampleSeries()
    const { container } = render(
      <DashboardTrend
        p2p={[]}
        wac={[]}
        profit={series.map((s) => ({ day: s.day, marginUsdMinor: s.marginUsdMinor }))}
        series={series}
        clientProjections={[]}
      />,
    )
    expect(container.textContent).not.toContain("الهامش الأساسي")
    expect(container.textContent).not.toContain("منحنى VIP")
    expect(container.textContent).not.toContain("حد تغيير المؤشر")
    const links = Array.from(container.querySelectorAll("a")).filter(
      (a) => a.getAttribute("href") === "/management/levels" && a.textContent?.trim() === "مستويات VIP",
    )
    expect(links).toHaveLength(1)
  })
})
