// @vitest-environment jsdom
import React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import P2pPriceStrip from "./p2p-price-strip"

afterEach(() => cleanup())

const range = {
  minEgpPerUsdtMinor: 5410,
  avgEgpPerUsdtMinor: 5430,
  maxEgpPerUsdtMinor: 5500,
  adCount: 20,
  stdDevEgpPerUsdtMinor: 190,
  outlierCount: 2,
}

describe("P2pPriceStrip", () => {
  it("renders one track with exactly 3 markers for min/avg/max with tooltips", () => {
    const { container } = render(<P2pPriceStrip range={range} />)

    const track = container.querySelector('[data-testid="p2p-track"]')
    expect(track).toBeTruthy()
    expect(track!.getAttribute("role")).toBe("img")
    expect(track!.getAttribute("aria-label")).toBeTruthy()
    expect(track!.getAttribute("aria-label")).toContain("54.10")
    expect(track!.getAttribute("aria-label")).toContain("54.30")
    expect(track!.getAttribute("aria-label")).toContain("55.00")
    expect(track!.getAttribute("aria-label")).toContain("عدد العروض 20")
    expect(track!.getAttribute("aria-label")).toContain("مستبعد 2")
    expect(track!.getAttribute("aria-label")).toContain("الانحراف المعياري 1.90 ج.م")
    expect(track!.getAttribute("title")).toContain("عدد العروض 20")
    expect(track!.getAttribute("title")).toContain("مستبعد 2")
    expect(track!.getAttribute("title")).toContain("الانحراف المعياري 1.90 ج.م")

    expect(container.textContent).toContain("عدد العروض")
    expect(container.textContent).toContain("20")
    expect(container.textContent).toContain("الانحراف المعياري")
    expect(container.textContent).toContain("1.90")
    expect(container.textContent).toContain("مستبعد")
    expect(container.textContent).toContain("2")
    expect(container.querySelector('[data-testid="p2p-offer-count"]')).toBeTruthy()

    const markers = Array.from(
      container.querySelectorAll('[data-testid="p2p-marker"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(3)

    const expected = [
      { kind: "min", label: "الحد الأدنى: 54.10 ج.م", value: "54.10" },
      { kind: "avg", label: "المتوسط: 54.30 ج.م", value: "54.30" },
      { kind: "max", label: "الحد الأعلى: 55.00 ج.م", value: "55.00" },
    ]

    expected.forEach((exp, i) => {
      const marker = markers[i]!
      expect(marker.getAttribute("data-kind")).toBe(exp.kind)
      expect(marker.getAttribute("data-tooltip")).toBe(exp.label)
      expect(marker.getAttribute("title")).toBe(exp.label)
      expect(marker.getAttribute("aria-label")).toBe(exp.label)
      expect(marker.getAttribute("aria-label")).toContain(exp.value)
      expect(marker.getAttribute("tabindex")).toBe("0")
      expect(marker.className).toContain("viz-point")
    })

    // Colours: min sky, avg ember, max jade (CSS tokens, no hex).
    expect(markers[0]!.style.backgroundColor).toContain("--sky")
    expect(markers[1]!.style.backgroundColor).toContain("--ember")
    expect(markers[2]!.style.backgroundColor).toContain("--jade")

    // Gradient rail sits behind the markers.
    expect(track!.className).toContain("p2p-scale-track")
    expect(track!.querySelector(".p2p-scale-line")).toBeTruthy()

    // Padded positions: range 5410..5500, pad = round(90 * 0.12) = 11,
    // scale 5399..5511 (span 112): min -> 11/112, avg -> 31/112, max -> 101/112.
    expect(parseFloat(markers[0]!.style.left)).toBeCloseTo((11 / 112) * 100)
    expect(parseFloat(markers[1]!.style.left)).toBeCloseTo((31 / 112) * 100)
    expect(parseFloat(markers[2]!.style.left)).toBeCloseTo((101 / 112) * 100)
    // Endpoints stay inside the line rather than at its edges.
    expect(parseFloat(markers[0]!.style.left)).toBeGreaterThan(0)
    expect(parseFloat(markers[2]!.style.left)).toBeLessThan(100)
  })

  it("renders the three values visibly on the number line", () => {
    const { container } = render(<P2pPriceStrip range={range} />)

    expect(container.querySelector('[data-testid="p2p-value-min"]')?.textContent).toBe("54.10")
    expect(container.querySelector('[data-testid="p2p-value-avg"]')?.textContent).toBe("54.30")
    expect(container.querySelector('[data-testid="p2p-value-max"]')?.textContent).toBe("55.00")
    expect(container.querySelectorAll('[data-testid^="p2p-value-"]')).toHaveLength(3)
  })

  it("has no method lanes", () => {
    const { container } = render(<P2pPriceStrip range={range} />)

    expect(container.querySelectorAll('[data-testid="p2p-lane"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="p2p-lane-track"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="p2p-lane-label"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="p2p-lane-empty"]')).toHaveLength(0)
    expect(container.querySelector('[data-method]')).toBeNull()
    expect(container.textContent).not.toContain("تحويل بنكي")
    expect(container.textContent).not.toContain("فودافون كاش")
  })

  it("renders the empty state when range is null", () => {
    const { container } = render(<P2pPriceStrip range={null} />)

    expect(container.textContent).toContain("نطاق عروض P2P مش متاح")
    expect(container.querySelectorAll('[data-testid="p2p-marker"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="p2p-track"]')).toHaveLength(0)
    expect(container.querySelector('[data-testid="p2p-offer-count"]')).toBeNull()
  })

  it("omits σ when stdDev is null but still shows offer count and outliers", () => {
    const { container } = render(
      <P2pPriceStrip
        range={{
          minEgpPerUsdtMinor: 5410,
          avgEgpPerUsdtMinor: 5430,
          maxEgpPerUsdtMinor: 5500,
          adCount: 20,
          stdDevEgpPerUsdtMinor: null,
          outlierCount: 0,
        }}
      />,
    )

    const track = container.querySelector('[data-testid="p2p-track"]')
    expect(track).toBeTruthy()
    expect(track!.getAttribute("aria-label")).toContain("عدد العروض 20")
    expect(track!.getAttribute("aria-label")).toContain("مستبعد 0")
    expect(track!.getAttribute("aria-label")).not.toContain("الانحراف المعياري")
    expect(track!.getAttribute("title")).not.toContain("الانحراف المعياري")

    const caption = container.querySelector('[data-testid="p2p-offer-count"]')
    expect(caption?.textContent).toContain("عدد العروض")
    expect(caption?.textContent).toContain("20")
    expect(caption?.textContent).toContain("مستبعد")
    expect(caption?.textContent).toContain("0")
    expect(caption?.textContent).not.toContain("الانحراف المعياري")
  })

  it("renders a custom empty label", () => {
    const { container } = render(
      <P2pPriceStrip range={null} emptyLabel="لا عروض حاليًا" />,
    )

    expect(container.textContent).toContain("لا عروض حاليًا")
    expect(container.textContent).not.toContain("نطاق عروض P2P مش متاح")
  })

  it("places all points at 50% when min equals max", () => {
    const { container } = render(
      <P2pPriceStrip
        range={{
          minEgpPerUsdtMinor: 5400,
          avgEgpPerUsdtMinor: 5400,
          maxEgpPerUsdtMinor: 5400,
          adCount: 5,
        }}
      />,
    )

    const markers = Array.from(
      container.querySelectorAll('[data-testid="p2p-marker"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(3)
    for (const marker of markers) {
      expect(parseFloat(marker.style.left)).toBeCloseTo(50)
      expect(marker.getAttribute("data-tooltip")).toContain("54.00")
    }
  })

  it("renders 4 markers including current when currentEgpPerUsdtMinor is provided", () => {
    const { container } = render(
      <P2pPriceStrip range={range} currentEgpPerUsdtMinor={5435} />,
    )

    const markers = Array.from(
      container.querySelectorAll('[data-testid="p2p-marker"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(4)
    expect(markers.map((m) => m.getAttribute("data-kind"))).toEqual([
      "min",
      "avg",
      "max",
      "current",
    ])

    expect(
      container.querySelector('[data-testid="p2p-value-current"]')?.textContent,
    ).toContain("54.35")

    const track = container.querySelector('[data-testid="p2p-track"]')
    expect(track).toBeTruthy()
    expect(track!.getAttribute("aria-label")).toContain("54.35")
    expect(track!.getAttribute("aria-label")).toContain("الحالي")
  })

  it("keeps the current marker inside the track when current is outside the range", () => {
    const { container } = render(
      <P2pPriceStrip
        range={range}
        currentEgpPerUsdtMinor={5600}
      />,
    )

    const current = container.querySelector(
      '[data-testid="p2p-marker"][data-kind="current"]',
    ) as HTMLElement | null
    expect(current).toBeTruthy()
    const left = parseFloat(current!.style.left)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left).toBeLessThanOrEqual(100)
  })

  it("renders the current value when range is null and current is provided", () => {
    const { container } = render(
      <P2pPriceStrip range={null} currentEgpPerUsdtMinor={5435} />,
    )

    expect(
      container.querySelector('[data-testid="p2p-value-current"]')?.textContent,
    ).toContain("54.35")
    expect(container.textContent).not.toContain("نطاق عروض P2P مش متاح")
  })
})
