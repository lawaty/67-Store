// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import type { AccountDto } from "@/api/contracts/account"

const { accountFixture } = vi.hoisted(() => ({
  accountFixture: {
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
        label: "Main",
        userId: "111",
        serverId: "2222",
        game: "mlbb",
        playerName: "Player One",
        createdAt: "2026-09-01T00:00:00Z",
        preferred: true,
      },
      {
        id: "p2",
        label: "Alt",
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
    fundingAvailable: true,
  } satisfies AccountDto,
}))

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/i18n/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("./actions", () => ({
  signOut: vi.fn(),
}))

vi.mock("@/frontend/account", () => ({
  getAccount: vi.fn().mockResolvedValue(accountFixture),
}))

import AccountPage from "./page"

afterEach(() => {
  cleanup()
})

async function renderPage(tab?: string, funded?: string) {
  const searchParams = Promise.resolve({ tab, funded })
  return render(await AccountPage({ searchParams }))
}

describe("AccountPage redesign", () => {
  it("renders four stat tiles and a 4-segment nav with aria-current on active tab", async () => {
    const { container } = await renderPage("wallet")
    const tiles = container.querySelectorAll(".stagger a.card.card-lift")
    expect(tiles).toHaveLength(4)

    const nav = screen.getByRole("navigation", { name: "Overview" })
    expect(nav.className).toContain("segmented-4")
    const segments = within(nav).getAllByRole("link")
    expect(segments).toHaveLength(4)
    const active = segments.find((s) => s.getAttribute("aria-current") === "true")
    expect(active).toBeDefined()
    expect(active?.textContent).toContain("Wallet")
  })

  it("renders the funded toast when ?funded=1", async () => {
    const { container } = await renderPage("wallet", "1")
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Coins added to your wallet")
  })

  it("orders tab shows Player/Date headers, named player, id·server fallback, and date", async () => {
    await renderPage("orders")
    expect(screen.queryByText("Player")).not.toBeNull()
    expect(screen.queryByText("Date")).not.toBeNull()
    expect(screen.getAllByText("Player One").length).toBeGreaterThan(0)
    expect(screen.getAllByText("333 · 4444").length).toBeGreaterThan(0)
    expect(screen.getAllByText("2026-10-03").length).toBeGreaterThan(0)
  })

  it("profiles tab renders ProfileCards read-only with default chip and manage link, no delete/set-default forms", async () => {
    const { container } = await renderPage("profiles")
    expect(container.querySelectorAll(".player-card").length).toBe(2)
    expect(screen.queryByText("Default player")).not.toBeNull()
    const manage = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/account/profiles")
    expect(manage).toBeDefined()
    // read-only: no delete/set-default actions
    expect(container.querySelector('form input[name="profileId"]')).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
    expect(screen.queryByText("Set as default")).toBeNull()
  })

  it("levels tab renders the levels panel", async () => {
    await renderPage("levels")
    expect(screen.getAllByText("Your levels").length).toBeGreaterThan(0)
    expect(screen.queryByText("Achievements")).not.toBeNull()
  })
})
