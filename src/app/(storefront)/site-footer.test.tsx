// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))
vi.mock("@/app/currency-switcher", () => ({ CurrencySwitcher: () => null }))
vi.mock("@/app/locale-switcher", () => ({ LocaleSwitcher: () => null }))
vi.mock("@/app/theme-toggle", () => ({ ThemeToggle: () => null }))

import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

afterEach(() => {
  cleanup()
})

describe("storefront chrome legal links", () => {
  it("renders the legal column with six links in order", () => {
    render(<SiteFooter locale="en" />)

    expect(screen.getByRole("heading", { level: 3, name: "Policies" })).not.toBeNull()

    const legalHeading = screen.getByRole("heading", { level: 3, name: "Policies" })
    const legalColumn = legalHeading.parentElement
    expect(legalColumn).not.toBeNull()

    const links = within(legalColumn!).getAllByRole("link")
    expect(links).toHaveLength(6)
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/terms",
      "/privacy",
      "/refund-policy",
      "/delivery",
      "/cookies",
      "/contact",
    ])
  })

  it("renders a header contact link to /contact", () => {
    render(<SiteHeader locale="en" method="paymob" />)

    const contactLinks = screen.getAllByRole("link", { name: /Contact us/i })
    expect(contactLinks.some((link) => link.getAttribute("href") === "/contact")).toBe(true)
  })
})
