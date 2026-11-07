// @vitest-environment jsdom
import React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import PartitionBar from "./partition-bar"
import BridgeBar from "./bridge-bar"
import MoveBar from "./move-bar"

afterEach(() => cleanup())

function segmentWidths(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('[data-testid="partition-segment"]')).map((el) =>
    parseFloat((el as HTMLElement).style.width.replace("%", "")),
  )
}

describe("PartitionBar", () => {
  it("renders labels and formatted amounts in the bar and legend", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "الإجمالي", minor: 100000 }}
        parts={[
          { label: "المسجّل", minor: 60000, tone: "jade" },
          { label: "قيد الانتظار", minor: 40000, tone: "sky" },
        ]}
        currency="USDT"
      />,
    )
    expect(container.textContent).toContain("الإجمالي")
    expect(container.textContent).toContain("المسجّل")
    expect(container.textContent).toContain("قيد الانتظار")
    // formatMinor: 60000 -> 600.00, 40000 -> 400.00, 100000 -> 1,000.00
    expect(container.textContent).toContain("600.00")
    expect(container.textContent).toContain("400.00")
    expect(container.textContent).toContain("1,000.00")

    const widths = segmentWidths(container)
    expect(widths).toHaveLength(2)
    expect(widths[0]!).toBeCloseTo(60)
    expect(widths[1]!).toBeCloseTo(40)

    const img = container.querySelector('[role="img"]')!
    expect(img.getAttribute("aria-label")).toMatch(/مخطط الأجزاء/)
  })

  it("renders the empty state instead of a bar when total is zero or no positive parts", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "الإجمالي", minor: 0 }}
        parts={[{ label: "المسجّل", minor: 0, tone: "jade" }]}
        emptyLabel="مفيش بيانات لعرضها"
      />,
    )
    expect(container.textContent).toContain("مفيش بيانات لعرضها")
    expect(container.querySelector('[data-testid="partition-bar"]')).toBeNull()

    cleanup()
    const { container: c2 } = render(
      <PartitionBar total={{ label: "الإجمالي", minor: 100000 }} parts={[]} emptyLabel="فارغ" />,
    )
    expect(c2.textContent).toContain("فارغ")
    expect(c2.querySelector('[data-testid="partition-bar"]')).toBeNull()
  })

  it("renders a muted residual segment labelled مش موزع when parts sum to less than total", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "الإجمالي", minor: 100000 }}
        parts={[{ label: "المسجّل", minor: 60000, tone: "jade" }]}
      />,
    )
    expect(container.textContent).toContain("مش موزع")
    expect(container.textContent).toContain("400.00")
    const widths = segmentWidths(container)
    expect(widths).toHaveLength(2)
    expect(widths[0]!).toBeCloseTo(60)
    expect(widths[1]!).toBeCloseTo(40)
    const residual = container.querySelector('[data-label="مش موزع"]') as HTMLElement
    expect(residual).toBeTruthy()
    expect(residual.style.backgroundColor).toContain("hsl")
    expect(residual.style.backgroundColor).toContain("--muted")
  })

  it("clips positive segments and shows a danger عجز strip in the overdraft state without negative widths", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "الإجمالي", minor: 100000 }}
        parts={[
          { label: "المسجّل", minor: 80000, tone: "jade" },
          { label: "قيد الانتظار", minor: 60000, tone: "sky" },
          { label: "تسوية", minor: -40000, tone: "gold" },
        ]}
      />,
    )
    // Positive sum 140000 exceeds total 100000; absolute difference 40000 -> 400.00.
    expect(container.textContent).toContain("عجز")
    expect(container.textContent).toContain("400.00")
    // Negative part shows its negative amount in the legend.
    expect(container.textContent).toContain("-400.00")

    const widths = segmentWidths(container)
    expect(widths).toHaveLength(2)
    // Clipped: 80000/140000 and 60000/140000.
    expect(widths[0]!).toBeCloseTo((80000 / 140000) * 100)
    expect(widths[1]!).toBeCloseTo((60000 / 140000) * 100)
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(0)

    const deficit = container.querySelector('[data-testid="partition-deficit"]')!
    expect(deficit).toBeTruthy()
    expect(deficit.textContent).toContain("عجز")

    // Negative part legend dot uses the danger tone.
    const legendItems = Array.from(container.querySelectorAll(".viz-legend-item"))
    const negativeItem = legendItems.find((li) => li.textContent?.includes("تسوية"))!
    const dot = negativeItem.querySelector(".viz-dot") as HTMLElement
    expect(dot.style.backgroundColor).toContain("--danger")
  })

  it("renders raw counts without decimals when formatValue stringifies the value", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "إجمالي المنتجات", minor: 10 }}
        parts={[
          { label: "قابل للشراء", minor: 7, tone: "jade" },
          { label: "غير نشط", minor: 3, tone: "muted" },
        ]}
        formatValue={(v) => String(v)}
      />,
    )
    expect(container.textContent).toContain("10")
    expect(container.textContent).toContain("7")
    expect(container.textContent).toContain("3")
    expect(container.textContent).not.toContain("10.00")
    expect(container.textContent).not.toContain("7.00")
    expect(container.textContent).not.toContain("3.00")
    const img = container.querySelector('[role="img"]')!
    expect(img.getAttribute("aria-label")).toContain("10")
  })

  it("honours a caller-supplied aria label", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "الإجمالي", minor: 100000 }}
        parts={[{ label: "المسجّل", minor: 100000, tone: "jade" }]}
        ariaLabel="وصف مخصص للاختبار."
      />,
    )
    expect(container.querySelector('[role="img"]')!.getAttribute("aria-label")).toBe("وصف مخصص للاختبار.")
  })

  it("uses a tight baseline header row by default", () => {
    const { container } = render(
      <PartitionBar
        total={{ label: "المسجل", minor: 100000 }}
        parts={[{ label: "محجوز", minor: 100000, tone: "sky" }]}
        currency="USDT"
      />,
    )
    const totalLabelEl = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "المسجل",
    )
    expect(totalLabelEl).toBeTruthy()
    const headerClass = totalLabelEl!.parentElement!.className
    expect(headerClass).toContain("flex")
    expect(headerClass).toContain("flex-wrap")
    expect(headerClass).toContain("items-baseline")
    expect(headerClass).toContain("gap-2")
    expect(headerClass).not.toContain("justify-between")
  })

  it("showTotal={false} hides the total header but keeps the bar and legend", () => {
    const { container } = render(
      <PartitionBar
        showTotal={false}
        total={{ label: "المسجل", minor: 100000 }}
        parts={[
          { label: "محجوز", minor: 40000, tone: "sky" },
          { label: "متاح", minor: 60000, tone: "jade" },
        ]}
        currency="USDT"
      />,
    )
    // Total label/value row is hidden.
    expect(container.textContent).not.toContain("المسجل")
    expect(container.textContent).not.toContain("1,000.00")
    // Bar and legend remain.
    expect(container.querySelector('[data-testid="partition-bar"]')).toBeTruthy()
    expect(container.textContent).toContain("محجوز")
    expect(container.textContent).toContain("متاح")
    expect(container.textContent).toContain("400.00")
    expect(container.textContent).toContain("600.00")
  })

  it("compact hides the header and uses compact bar and legend classes", () => {
    const { container } = render(
      <PartitionBar
        compact
        total={{ label: "المسجل", minor: 100000 }}
        parts={[
          { label: "محجوز", minor: 40000, tone: "sky" },
          { label: "حر", minor: 60000, tone: "jade" },
        ]}
        currency="USDT"
      />,
    )
    // Header row (total label) is hidden in compact mode.
    expect(container.textContent).not.toContain("المسجل")
    expect(container.querySelector(".viz-bar-compact")).toBeTruthy()
    expect(container.querySelector(".viz-legend-compact")).toBeTruthy()
    // Legend labels remain.
    expect(container.textContent).toContain("محجوز")
    expect(container.textContent).toContain("حر")
  })
})

describe("BridgeBar", () => {
  const bridgeParts = [
    { label: "المسجّل", minor: 60000, tone: "jade" as const },
    { label: "قيد الانتظار", minor: 30000, tone: "sky" as const },
    { label: "غير الممثل", minor: 10000, tone: "gold" as const },
  ]

  it("renders recorded, pending, unrepresented and the live total", () => {
    const { container } = render(<BridgeBar total={{ label: "live", minor: 100000 }} parts={bridgeParts} />)
    expect(container.textContent).toContain("المسجّل")
    expect(container.textContent).toContain("قيد الانتظار")
    expect(container.textContent).toContain("غير الممثل")
    expect(container.textContent).toContain("live")
    expect(container.textContent).toContain("1,000.00")
    expect(container.textContent).toContain("600.00")
    expect(container.textContent).toContain("300.00")
    expect(container.textContent).toContain("100.00")

    // No header equation row: labels and amounts live in the legend only.
    expect(container.querySelector('[data-testid="bridge-header"]')).toBeNull()
    expect(container.querySelectorAll('[data-testid="partition-segment"]')).toHaveLength(3)
    expect(container.querySelectorAll(".viz-legend-item")).toHaveLength(3)

    // Reuses PartitionBar for the visual.
    expect(container.querySelector('[data-testid="partition-bar"]')).toBeTruthy()
    // Exact match: no deficit chip and no unavailable note.
    expect(container.querySelector('[data-testid="partition-deficit"]')).toBeNull()
    expect(container.querySelector('[data-testid="bridge-unavailable"]')).toBeNull()

    const img = container.querySelector('[role="img"]')!
    expect(img.getAttribute("aria-label")).toMatch(/جسر التسوية/)
    expect(img.getAttribute("aria-label")).toContain("المسجّل")
  })

  it("renders the unavailable state without showing zero as the live total", () => {
    const { container } = render(
      <BridgeBar
        total={{ label: "live", minor: null }}
        parts={[
          { label: "المسجّل", minor: 60000, tone: "jade" },
          { label: "قيد الانتظار", minor: 40000, tone: "sky" },
        ]}
      />,
    )
    expect(container.textContent).toContain("الرصيد المباشر مش متاح")
    expect(container.querySelector('[data-testid="bridge-unavailable"]')!.textContent).toContain(
      "الرصيد المباشر مش متاح",
    )
    // No header equation row when the live total is unavailable.
    expect(container.querySelector('[data-testid="bridge-header"]')).toBeNull()
    expect(container.querySelectorAll(".viz-legend-item")).toHaveLength(2)
    // Parts are rendered against their own sum (60000/100000, 40000/100000).
    const widths = segmentWidths(container)
    expect(widths).toHaveLength(2)
    expect(widths[0]!).toBeCloseTo(60)
    expect(widths[1]!).toBeCloseTo(40)
    // Stays absent of a deficit strip.
    expect(container.querySelector('[data-testid="partition-deficit"]')).toBeNull()
  })

  it("shows a danger عجز chip when parts sum to more than the live total", () => {
    const { container } = render(
      <BridgeBar
        total={{ label: "live", minor: 100000 }}
        parts={[
          { label: "المسجّل", minor: 70000, tone: "jade" },
          { label: "قيد الانتظار", minor: 30000, tone: "sky" },
          { label: "غير الممثل", minor: 20000, tone: "gold" },
        ]}
      />,
    )
    // Sum 120000 exceeds live 100000 by 20000 -> 200.00; deficit comes from PartitionBar.
    expect(container.querySelector('[data-testid="bridge-header"]')).toBeNull()
    expect(container.querySelector('[data-testid="bridge-deficit"]')).toBeNull()
    const chip = container.querySelector('[data-testid="partition-deficit"]')!
    expect(chip).toBeTruthy()
    expect(chip.textContent).toContain("عجز")
    expect(chip.textContent).toContain("200.00")
  })
})

describe("MoveBar", () => {
  it("renders a positive move to the right of the centre", () => {
    const { container } = render(<MoveBar moveBps={500} capBps={1000} />)
    expect(container.textContent).toContain("+5.00%")
    expect(container.textContent).toContain("10.00%")
    const fill = container.querySelector('[data-testid="move-fill"]') as HTMLElement
    expect(fill).toBeTruthy()
    // min(500/1000, 1) * 50 = 25.
    expect(parseFloat(fill.style.width)).toBeCloseTo(25)
    expect(fill.style.left).toBe("50%")
    expect(fill.style.backgroundColor).toContain("--jade")
    expect(container.querySelector('[role="img"]')!.getAttribute("aria-label")).toMatch(/شريط الحركة/)
  })

  it("renders a negative move to the left of the centre", () => {
    const { container } = render(<MoveBar moveBps={-250} capBps={500} />)
    expect(container.textContent).toContain("-2.50%")
    expect(container.textContent).toContain("5.00%")
    const fill = container.querySelector('[data-testid="move-fill"]') as HTMLElement
    expect(fill).toBeTruthy()
    expect(parseFloat(fill.style.width)).toBeCloseTo(25)
    // Left edge sits at 50% - 25% = 25%.
    expect(parseFloat(fill.style.left)).toBeCloseTo(25)
    expect(fill.style.backgroundColor).toContain("--danger")
  })

  it("renders the null move as a dash with an empty track and a cap label", () => {
    const { container } = render(<MoveBar moveBps={null} capBps={500} />)
    expect(container.textContent).toContain("—")
    expect(container.textContent).toContain("5.00%")
    expect(container.querySelector('[data-testid="move-fill"]')).toBeNull()
    expect(container.querySelector('[data-testid="move-track"]')).toBeTruthy()
  })

  it("caps the fill at 50% and shows the ثابت عند الحد chip when capped", () => {
    const { container } = render(<MoveBar moveBps={2000} capBps={1000} capped />)
    expect(container.textContent).toContain("+20.00%")
    expect(container.textContent).toContain("مثبت عند الحد")
    expect(container.querySelector('[data-testid="move-capped"]')!.textContent).toContain("مثبت عند الحد")
    const fill = container.querySelector('[data-testid="move-fill"]') as HTMLElement
    expect(parseFloat(fill.style.width)).toBeCloseTo(50)
  })
})
