// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { PlayerIdentityFields } from "./player-identity-fields"

const originalFetch = global.fetch

function mockFetch(response: unknown) {
  const fn = vi.fn().mockResolvedValue(response)
  global.fetch = fn as unknown as typeof fetch
  return fn
}

function typeIds() {
  fireEvent.change(document.querySelector("#userId") as HTMLInputElement, { target: { value: "123456789" } })
  fireEvent.change(document.querySelector("#serverId") as HTMLInputElement, { target: { value: "1234" } })
}

afterEach(() => {
  cleanup()
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("PlayerIdentityFields", () => {
  it("shows the verified name when the player check is valid", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => ({ valid: true, name: "Dragon" }) })
    render(<PlayerIdentityFields locale="en" variant="topup" />)
    typeIds()
    const text = await screen.findByText(/Player verified/, {}, { timeout: 2000 })
    expect(text.textContent).toContain("Dragon")
    expect(fetchMock).toHaveBeenCalled()
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/players/verify")
  })

  it("marks the player id invalid when the check returns no valid player", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ valid: false, name: null }) })
    render(<PlayerIdentityFields locale="en" variant="topup" />)
    typeIds()
    await screen.findByText(/Player ID or server ID is invalid/i, {}, { timeout: 2000 })
    expect(document.querySelector("#userId")?.getAttribute("aria-invalid")).toBe("true")
  })

  it("shows the unverified message when verification is unavailable", async () => {
    mockFetch({ ok: false, status: 503, json: async () => ({}) })
    render(<PlayerIdentityFields locale="en" variant="topup" />)
    typeIds()
    await screen.findByText(/Couldn't verify the player right now/i, {}, { timeout: 2000 })
  })
})
