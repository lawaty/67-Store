// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { LevelsPanel } from "./levels-panel"
import type { AccountLevelsDto } from "@/api/contracts/account"

const epic = { key: "epic", title: "Epic", icon: "shield", color: "sky", coins: 0, basisPoints: 2000 } as const
const mythic = { key: "mythic", title: "Mythic", icon: "gem", color: "gold", coins: 1000, basisPoints: 1500 } as const
const immortal = { key: "immortal", title: "Immortal", icon: "flame", color: "ember", coins: 5000, basisPoints: 1000 } as const

function makeLevels(overrides: Partial<AccountLevelsDto> = {}): AccountLevelsDto {
  return {
    volume30d: 500,
    current: { ...epic },
    next: { ...mythic },
    toNext: 500,
    percent: 50,
    effectiveMarginBasisPoints: 2000,
    levels: [{ ...epic }, { ...mythic }, { ...immortal }],
    earnedBadges: [
      { levelKey: "epic", title: "Epic", icon: "shield", color: "sky", coins: 0, earnedAt: "2026-01-01T00:00:00.000Z" },
    ],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe("LevelsPanel", () => {
  it("shows current level title, effective margin, and volume", () => {
    render(<LevelsPanel levels={makeLevels({ volume30d: 750, effectiveMarginBasisPoints: 1500 })} locale="en" />)

    expect(screen.getAllByText("Epic").length).toBeGreaterThan(0)
    expect(screen.getByText("15%")).toBeTruthy()
    expect(screen.getByText("750")).toBeTruthy()
  })

  it("formats fractional margins trimmed", () => {
    render(<LevelsPanel levels={makeLevels({ effectiveMarginBasisPoints: 1250 })} locale="en" />)
    expect(screen.getByText("12.5%")).toBeTruthy()
  })

  it("shows progress to the next level with progressbar and remaining coins", () => {
    render(
      <LevelsPanel
        levels={makeLevels({ percent: 40, toNext: 500, next: { ...mythic }, current: { ...epic } })}
        locale="en"
      />,
    )

    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("40")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.getAttribute("style")).toContain("width: 40%")
    expect(screen.getByText("500 more coins to reach Mythic")).toBeTruthy()
  })

  it("shows top-level message and full bar at the top level", () => {
    render(
      <LevelsPanel
        levels={makeLevels({ next: null, percent: 100, current: { ...immortal } })}
        locale="en"
      />,
    )

    expect(screen.getByText("You are at the top level")).toBeTruthy()
    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.getAttribute("style")).toContain("width: 100%")
  })

  it("marks earned badges with date and locked badges with lock label", () => {
    render(<LevelsPanel levels={makeLevels()} locale="en" />)

    expect(screen.getByText("Achievements")).toBeTruthy()
    expect(screen.getAllByText("Earned").length).toBeGreaterThan(0)
    expect(screen.getByText("2026-01-01")).toBeTruthy()
    expect(screen.getAllByText("Locked").length).toBeGreaterThan(0)
    expect(screen.getByText("1000 coins")).toBeTruthy()
    expect(screen.getByText("5000 coins")).toBeTruthy()
  })

  it("renders an orphaned earned badge with its snapshot title and earned treatment", () => {
    const levels = makeLevels({
      earnedBadges: [
        { levelKey: "epic", title: "Epic", icon: "shield", color: "sky", coins: 0, earnedAt: "2026-01-01T00:00:00.000Z" },
        { levelKey: "retired", title: "Retired Old", icon: "gift", color: "gold", coins: 100, earnedAt: "2026-02-01T00:00:00.000Z" },
      ],
    })

    render(<LevelsPanel levels={levels} locale="en" />)

    expect(screen.getByText("Retired Old")).toBeTruthy()
    expect(screen.getByText("2026-02-01")).toBeTruthy()
    expect(screen.getByText("100 coins")).toBeTruthy()
    expect(screen.getAllByText("Earned").length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText("Retired Old")?.closest(".card")?.className).toContain("card-lift")
  })

  it("clamps percent above 100", () => {
    render(<LevelsPanel levels={makeLevels({ percent: 150 })} locale="en" />)

    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuemin")).toBe("0")
    expect(bar.getAttribute("aria-valuemax")).toBe("100")
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.getAttribute("style")).toContain("width: 100%")
  })

  it("clamps percent below 0", () => {
    render(<LevelsPanel levels={makeLevels({ percent: -20 })} locale="en" />)

    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("0")
    const fill = bar.firstElementChild as HTMLElement
    expect(fill.getAttribute("style")).toContain("width: 0%")
  })
})
