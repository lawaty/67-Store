// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import type { AccountDto } from "@/api/contracts/account"

vi.mock("@/i18n/server", () => ({ getLocale: vi.fn(async () => "en") }))
vi.mock("@/frontend/account", () => ({ getAccount: vi.fn() }))
vi.mock("../actions", () => ({ signOut: vi.fn() }))
vi.mock("./account-nav", () => ({ AccountNav: () => <nav data-testid="account-nav" /> }))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import AccountDashboardLayout from "./layout"
import { getAccount } from "@/frontend/account"

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

afterEach(cleanup)

describe("AccountDashboardLayout", () => {
  it("renders the persistent summary and badge-wall rail", async () => {
    vi.mocked(getAccount).mockResolvedValue(accountFixture)

    const { container } = render(
      await AccountDashboardLayout({ children: <div data-testid="child">content</div> }),
    )

    expect(container.querySelector(".account-rail")).not.toBeNull()
    expect(screen.getByText("Overview")).toBeTruthy()
    expect(screen.getByTestId("badge-wall")).toBeTruthy()
    // compact identity in rail
    expect(screen.getAllByText("player").length).toBeGreaterThan(0)
    expect(screen.getAllByText("player@example.com").length).toBeGreaterThan(0)
    expect(screen.getByTestId("child")).toBeTruthy()
    expect(screen.getByTestId("account-nav")).toBeTruthy()
    expect(container.querySelector(".account-main")?.contains(screen.getByTestId("child"))).toBe(true)
  })

  it("omits the rail when the account cannot be loaded", async () => {
    vi.mocked(getAccount).mockResolvedValue(null)

    const { container } = render(
      await AccountDashboardLayout({ children: <div data-testid="child">content</div> }),
    )

    expect(container.querySelector(".account-rail")).toBeNull()
    expect(screen.getByTestId("child")).toBeTruthy()
  })
})
