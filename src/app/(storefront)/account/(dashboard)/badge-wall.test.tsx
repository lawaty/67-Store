// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import type { AccountAchievementDto } from "@/api/contracts/account"
import { BadgeWall } from "./badge-wall"

const achievements: readonly AccountAchievementDto[] = [
  {
    key: "silver",
    source: "level",
    title: "Silver",
    description: "Silver level",
    icon: "sparkles",
    color: "sky",
    count: 1,
    target: 200,
    earned: true,
  },
  {
    key: "gold",
    source: "level",
    title: "Gold",
    description: "Gold level",
    icon: "sparkles",
    color: "gold",
    count: 0,
    target: 600,
    earned: false,
  },
  {
    key: "streak",
    source: "managed",
    title: "Streak",
    description: "Do 5 things",
    icon: "flame",
    color: "ember",
    count: 2,
    target: 5,
    earned: false,
  },
]

afterEach(() => {
  cleanup()
})

describe("BadgeWall", () => {
  it("renders achievement grid with count badges and tooltip text", () => {
    render(<BadgeWall achievements={achievements} locale="en" />)

    expect(screen.getByTestId("badge-wall")).toBeTruthy()
    expect(screen.getByText("Achievements")).toBeTruthy()

    // count badges
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
    expect(screen.getAllByText("0").length).toBeGreaterThan(0)
    expect(screen.getAllByText("2").length).toBeGreaterThan(0)

    // tooltip content
    expect(screen.getByText("Silver")).toBeTruthy()
    expect(screen.getByText("200 coins")).toBeTruthy()
    expect(screen.getByText("Streak")).toBeTruthy()
    expect(screen.getByText("Do 5 things")).toBeTruthy()
    expect(screen.getByText("2 / 5")).toBeTruthy()
  })
})
