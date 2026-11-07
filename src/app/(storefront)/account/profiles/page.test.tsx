// @vitest-environment jsdom
/**
 * Renders the profiles page roster and add form, verifying default/set-default
 * actions, removal feedback, and profile identity display.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ProfileDto } from "@/api/contracts"

vi.mock("@/frontend/account", () => ({
  getProfiles: vi.fn(),
}))

vi.mock("@/i18n/server", () => ({
  getLocale: vi.fn(async () => "en"),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("./actions", () => ({
  addProfile: vi.fn(),
  removeProfile: vi.fn(),
  savePlayerPreference: vi.fn(),
}))

vi.mock("../../player-identity-fields", () => ({
  PlayerIdentityFields: () => <div data-testid="player-identity-fields" />,
}))

import { getProfiles } from "@/frontend/account"
import ProfilesPage from "./page"

const preferredProfile: ProfileDto = {
  id: "p-default",
  label: "Main",
  userId: "111",
  serverId: "2222",
  game: "mlbb",
  playerName: "Hero",
  createdAt: "2026-11-01T12:00:00.000Z",
  preferred: true,
}

const plainProfile: ProfileDto = {
  id: "p-plain",
  label: "Smurf",
  userId: "333",
  serverId: "4444",
  game: "mlbb",
  playerName: null,
  createdAt: null,
  preferred: false,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function renderPage(searchParams: Record<string, string | undefined> = {}) {
  vi.mocked(getProfiles).mockResolvedValue([preferredProfile, plainProfile])
  const ui = await ProfilesPage({ searchParams: Promise.resolve(searchParams) })
  return render(ui)
}

describe("ProfilesPage", () => {
  it("renders verified and plain profile names", async () => {
    await renderPage()

    expect(screen.getByRole("heading", { name: "Hero" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Smurf" })).toBeTruthy()
  })

  it("shows default chip without set-default for preferred, and set-default for plain", async () => {
    const { container } = await renderPage()

    expect(screen.getByText("Default player")).toBeTruthy()

    const setDefaultForms = container.querySelectorAll('input[name="userId"][value="333"]')
    expect(setDefaultForms.length).toBe(1)
    const setDefaultForm = setDefaultForms[0]?.closest("form")
    expect(setDefaultForm).not.toBeNull()
    expect(setDefaultForm?.querySelector('input[name="serverId"][value="4444"]')).not.toBeNull()
    expect(setDefaultForm?.textContent).toContain("Set as default")

    expect(container.querySelector('input[name="userId"][value="111"]')).toBeNull()
  })

  it("renders a delete form with hidden profileId for every card", async () => {
    const { container } = await renderPage()

    expect(container.querySelector('input[name="profileId"][value="p-default"]')).not.toBeNull()
    expect(container.querySelector('input[name="profileId"][value="p-plain"]')).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBe(2)
  })

  it("renders removal toast when removed=1", async () => {
    await renderPage({ removed: "1" })

    expect(screen.getByText("Player profile deleted")).toBeTruthy()
  })

  it("renders add-profile details and form fields", async () => {
    const { container } = await renderPage()

    expect(container.querySelector("details.add-profile")).not.toBeNull()
    expect(screen.getByLabelText("Profile name")).toBeTruthy()
    expect(screen.getByLabelText("Game")).toBeTruthy()
    expect(screen.getByTestId("player-identity-fields")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Save profile/i })).toBeTruthy()
  })

  it("renders addedOn for profiles with createdAt", async () => {
    await renderPage()

    expect(screen.getByText("Added 2026-11-01")).toBeTruthy()
  })
})
