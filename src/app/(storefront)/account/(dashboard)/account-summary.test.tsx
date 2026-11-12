// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { AccountDto } from "@/api/contracts/account"

const accountFixture = {
  wallet: { coinBalance: 250 },
  entries: [
    { id: "e1", amount: 100, reason: "topup", createdAt: "2026-10-01T00:00:00Z" },
    { id: "e2", amount: -20, reason: "order", createdAt: "2026-10-02T00:00:00Z" },
  ],
  orders: [
    {
      id: "o1",
      token: "ordertoken1",
      status: "PAID",
      productName: "86 Diamonds",
      price: { minor: 500, currency: "EGP" },
      createdAt: "2026-10-03T00:00:00Z",
      userId: "111",
      serverId: "2222",
      playerName: "Player One",
    },
    {
      id: "o2",
      token: "ordertoken2",
      status: "CREATED",
      productName: "172 Diamonds",
      price: { minor: 900, currency: "EGP" },
      createdAt: null,
      userId: "333",
      serverId: "4444",
      playerName: null,
    },
  ],
  profiles: [
    {
      id: "p1",
      userId: "111",
      serverId: "2222",
      game: "mlbb",
      playerName: "Player One",
      createdAt: "2026-09-01T00:00:00Z",
      preferred: true,
    },
    {
      id: "p2",
      userId: "555",
      serverId: "6666",
      game: "mlbb",
      playerName: null,
      createdAt: null,
      preferred: false,
    },
  ],
  levels: {
    volume30d: 400,
    current: { key: "silver", title: "Silver", icon: "sparkles", color: "sky", coins: 200, basisPoints: 300 },
    next: { key: "gold", title: "Gold", icon: "sparkles", color: "gold", coins: 600, basisPoints: 200 },
    toNext: 200,
    percent: 50,
    effectiveMarginBasisPoints: 300,
    levels: [
      { key: "silver", title: "Silver", icon: "sparkles", color: "sky", coins: 200, basisPoints: 300 },
      { key: "gold", title: "Gold", icon: "sparkles", color: "gold", coins: 600, basisPoints: 200 },
    ],
    earnedBadges: [
      { levelKey: "silver", title: "Silver", icon: "sparkles", color: "sky", coins: 200, earnedAt: "2026-08-01T00:00:00Z" },
    ],
  },
  identity: { username: "player", email: "player@example.com" },
  achievements: [],
  fundingAvailable: true,
} satisfies AccountDto

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

import { AccountSummary } from "./account-summary"

afterEach(() => {
  cleanup()
})

describe("AccountSummary", () => {
  it("renders overview with stats and quick actions", () => {
    render(<AccountSummary account={accountFixture} locale="en" />)

    expect(screen.getByText("Overview")).toBeTruthy()
    expect(screen.getByText("Quick actions")).toBeTruthy()

    const links = screen.getAllByRole("link")
    const hrefs = links.map((link) => link.getAttribute("href"))
    expect(hrefs).toContain("/account?tab=wallet")
    expect(hrefs).toContain("/account?tab=orders")
    expect(hrefs).toContain("/account?tab=levels")
    expect(hrefs).toContain("/account?tab=profiles")

    expect(screen.getByText("250")).toBeTruthy()
    expect(screen.getByText("Silver")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Fund wallet/i })).toBeTruthy()
    expect(hrefs).not.toContain("/account/fund")
    expect(hrefs).toContain("/account/profiles")
    expect(screen.getAllByText("Default player").length).toBeGreaterThan(0)
    expect(document.querySelector(".player-card")).toBeTruthy()
  })

  it("hides fund link when fundingAvailable is false", () => {
    render(<AccountSummary account={{ ...accountFixture, fundingAvailable: false }} locale="en" />)
    expect(screen.queryByRole("button", { name: /Fund wallet/i })).toBeNull()
    const links = screen.getAllByRole("link")
    const hrefs = links.map((link) => link.getAttribute("href"))
    expect(hrefs).not.toContain("/account/fund")
  })

  it("does not show default player when there are no profiles", () => {
    render(<AccountSummary account={{ ...accountFixture, profiles: [] }} locale="en" />)
    expect(screen.queryByText("Default player")).toBeNull()
    expect(document.querySelector(".player-card")).toBeNull()
  })
})
