// @vitest-environment jsdom
import React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import RateLadder from "./rate-ladder"
import StatusChips from "./status-chips"

afterEach(() => cleanup())

describe("RateLadder", () => {
  it("renders distinct min/max/mid positions on a shared EGP axis with min/max labels", () => {
    const { container } = render(
      <RateLadder
        rungs={[
          { label: "الأدنى", egpPerUsdtMinor: 5000, tone: "sky" },
          { label: "الأوسط", egpPerUsdtMinor: 5500, tone: "gold" },
          { label: "الأعلى", egpPerUsdtMinor: 6000, tone: "jade" },
        ]}
      />,
    )
    expect(container.textContent).toContain("الأدنى")
    expect(container.textContent).toContain("الأوسط")
    expect(container.textContent).toContain("الأعلى")
    expect(container.textContent).toContain("50.00")
    expect(container.textContent).toContain("55.00")
    expect(container.textContent).toContain("60.00")
    expect(container.textContent).toContain("ج.م")

    const markers = Array.from(
      container.querySelectorAll('[data-testid="rate-ladder-marker"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(3)
    expect(parseFloat(markers[0]!.style.left)).toBeCloseTo(0)
    expect(parseFloat(markers[1]!.style.left)).toBeCloseTo(50)
    expect(parseFloat(markers[2]!.style.left)).toBeCloseTo(100)
    expect(markers[0]!.style.backgroundColor).toContain("--sky")
    expect(markers[2]!.style.backgroundColor).toContain("--jade")

    const tracks = Array.from(container.querySelectorAll('[data-testid="rate-ladder-track"]'))
    expect(tracks).toHaveLength(3)
    for (const track of tracks) {
      expect(track.getAttribute("dir")).toBe("ltr")
      expect(track.getAttribute("aria-label")).toMatch(/سعر/)
    }
    expect(tracks[0]!.getAttribute("aria-label")).toContain("الأدنى")
    expect(tracks[0]!.getAttribute("aria-label")).toContain("50.00")

    const axis = container.querySelector('[data-testid="rate-ladder-axis"]')!
    expect(axis).toBeTruthy()
    expect(axis.textContent).toContain("50.00")
    expect(axis.textContent).toContain("60.00")
  })

  it("places a single value and equal values at 50% with no axis labels", () => {
    const { container } = render(
      <RateLadder rungs={[{ label: "وحيد", egpPerUsdtMinor: 5200, tone: "jade" }]} />,
    )
    const single = container.querySelector('[data-testid="rate-ladder-marker"]') as HTMLElement
    expect(parseFloat(single.style.left)).toBeCloseTo(50)
    expect(container.querySelector('[data-testid="rate-ladder-axis"]')).toBeNull()

    cleanup()
    const { container: c2 } = render(
      <RateLadder
        rungs={[
          { label: "أ", egpPerUsdtMinor: 5200, tone: "sky" },
          { label: "ب", egpPerUsdtMinor: 5200, tone: "gold" },
        ]}
      />,
    )
    const markers = Array.from(
      c2.querySelectorAll('[data-testid="rate-ladder-marker"]'),
    ) as HTMLElement[]
    expect(markers).toHaveLength(2)
    for (const m of markers) expect(parseFloat(m.style.left)).toBeCloseTo(50)
    expect(c2.querySelector('[data-testid="rate-ladder-axis"]')).toBeNull()
  })

  it("renders a null rung as a dash with no marker", () => {
    const { container } = render(
      <RateLadder
        rungs={[
          { label: "متاح", egpPerUsdtMinor: 5000, tone: "jade" },
          { label: "مش متاح", egpPerUsdtMinor: null, tone: "muted" },
        ]}
      />,
    )
    expect(container.textContent).toContain("—")
    const markers = container.querySelectorAll('[data-testid="rate-ladder-marker"]')
    expect(markers).toHaveLength(1)
    const tracks = container.querySelectorAll('[data-testid="rate-ladder-track"]')
    expect(tracks).toHaveLength(2)
    expect(tracks[1]!.getAttribute("aria-label")).toContain("مش متاح")
  })

  it("renders emphasis with font-bold text-ink and others with text-muted", () => {
    const { container } = render(
      <RateLadder
        rungs={[
          { label: "عادي", egpPerUsdtMinor: 5000, tone: "sky" },
          { label: "مميز", egpPerUsdtMinor: 6000, tone: "jade", emphasis: true },
        ]}
      />,
    )
    const rows = Array.from(container.querySelectorAll('[data-testid="rate-ladder-row"]'))
    const labels = Array.from(container.querySelectorAll('[data-testid="rate-ladder-label"]'))
    const values = Array.from(container.querySelectorAll('[data-testid="rate-ladder-value"]'))
    expect(labels[0]!.textContent).toBe("عادي")
    expect(labels[1]!.textContent).toBe("مميز")
    expect(labels[0]!.className).toContain("text-muted")
    expect(labels[0]!.className).not.toContain("font-bold")
    expect(labels[1]!.className).toContain("font-bold")
    expect(labels[1]!.className).toContain("text-ink")
    expect(values[1]!.className).toContain("font-bold")
    expect(values[1]!.className).toContain("text-ink")
    expect(rows[1]!.className).toContain("font-bold")
    expect(rows[0]!.className).toContain("text-muted")
  })

  it("carries a caller-supplied aria label on the whole component", () => {
    const { container } = render(
      <RateLadder
        rungs={[{ label: "أ", egpPerUsdtMinor: 5000, tone: "jade" }]}
        ariaLabel="وصف مخصص."
      />,
    )
    expect(container.querySelector('[data-testid="rate-ladder"]')!.getAttribute("aria-label")).toBe(
      "وصف مخصص.",
    )
  })
})

describe("StatusChips", () => {
  it("renders labels and details with tone dots", () => {
    const { container } = render(
      <StatusChips
        items={[
          { label: "مكتمل", tone: "jade", detail: "12" },
          { label: "قيد الانتظار", tone: "gold", detail: "3" },
          { label: "فشل", tone: "danger" },
        ]}
      />,
    )
    expect(container.textContent).toContain("مكتمل")
    expect(container.textContent).toContain("قيد الانتظار")
    expect(container.textContent).toContain("فشل")
    expect(container.textContent).toContain("12")
    expect(container.textContent).toContain("3")

    const chips = Array.from(container.querySelectorAll('[data-testid="status-chip"]'))
    expect(chips).toHaveLength(3)
    const details = Array.from(container.querySelectorAll(".num.text-ink"))
    expect(details).toHaveLength(2)
    expect(details[0]!.textContent).toBe("12")

    const dots = Array.from(container.querySelectorAll(".viz-dot")) as HTMLElement[]
    expect(dots).toHaveLength(3)
    expect(dots[0]!.style.backgroundColor).toContain("--jade")
    expect(dots[1]!.style.backgroundColor).toContain("--gold")
    expect(dots[2]!.style.backgroundColor).toContain("--danger")

    const list = container.querySelector('[data-testid="status-chips"]')!
    expect(list.className).toContain("flex")
    expect(list.className).toContain("flex-wrap")
    for (const chip of chips) expect(chip.className).toContain("rounded-full")
  })

  it("renders the empty label when items are empty", () => {
    const { container } = render(<StatusChips items={[]} emptyLabel="لا شيء" />)
    expect(container.textContent).toContain("لا شيء")
    expect(container.querySelector('[data-testid="status-chips"]')).toBeNull()
    expect(container.querySelector('[data-testid="status-chip"]')).toBeNull()

    cleanup()
    const { container: c2 } = render(<StatusChips items={[]} />)
    expect(c2.textContent).toBe("")
    expect(c2.querySelector('[data-testid="status-chips"]')).toBeNull()
  })
})
