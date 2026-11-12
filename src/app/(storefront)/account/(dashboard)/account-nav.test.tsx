// @vitest-environment jsdom
/**
 * Covers the sidebar navigator's active-state derivation from the pathname
 * and the ?tab= search param, and its link targets.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { pathname, searchParams } = vi.hoisted(() => ({
  pathname: vi.fn<(path?: string) => string>(),
  searchParams: vi.fn<(query?: string) => string>(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(searchParams()),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { AccountNav } from "./account-nav"

afterEach(() => {
  cleanup()
})

function renderNav(path: string, query = "") {
  pathname.mockReturnValue(path)
  searchParams.mockReturnValue(query)
  return render(<AccountNav locale="en" />)
}

describe("AccountNav", () => {
  it("marks profiles active by default on /account", () => {
    renderNav("/account")
    expect(screen.getByRole("link", { name: /profiles/i }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: /wallet/i }).getAttribute("aria-current")).toBeNull()
  })

  it("marks the requested tab active for ?tab=", () => {
    renderNav("/account", "tab=orders")
    expect(screen.getByRole("link", { name: /orders/i }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: /wallet/i }).getAttribute("aria-current")).toBeNull()
  })

  it("marks profiles active for ?tab=profiles and on /account/profiles", () => {
    renderNav("/account", "tab=profiles")
    expect(screen.getByRole("link", { name: /profiles/i }).getAttribute("aria-current")).toBe("page")
    cleanup()
    renderNav("/account/profiles")
    expect(screen.getByRole("link", { name: /profiles/i }).getAttribute("aria-current")).toBe("page")
  })

  it("links profiles to the dedicated page and other sections to their tabs", () => {
    renderNav("/account")
    expect(screen.getByRole("link", { name: /profiles/i }).getAttribute("href")).toBe("/account/profiles")
    expect(screen.getByRole("link", { name: /wallet/i }).getAttribute("href")).toBe("/account?tab=wallet")
    expect(screen.getByRole("link", { name: /levels/i }).getAttribute("href")).toBe("/account?tab=levels")
  })

  it("renders a labeled navigation landmark", () => {
    renderNav("/account")
    expect(screen.getByRole("navigation", { name: "Your account" })).toBeTruthy()
  })
})
