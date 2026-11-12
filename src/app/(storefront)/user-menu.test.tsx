// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/app/currency-switcher", () => ({
  CurrencySwitcher: () => <div data-testid="currency-switcher" />,
}))
vi.mock("@/app/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}))
vi.mock("@/app/theme-toggle", () => ({
  ThemeToggle: ({ label }: { label: string }) => <button aria-label={label}>theme</button>,
}))

import { UserMenu } from "./user-menu"

afterEach(() => {
  cleanup()
})

describe("user menu", () => {
  it("menu is closed initially", () => {
    render(<UserMenu locale="en" method="paymob" />)
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("clicking the avatar shows the panel", () => {
    render(<UserMenu locale="en" method="paymob" />)
    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }))
    expect(screen.getByRole("menu")).not.toBeNull()
  })

  it("the account link points at /account", () => {
    render(<UserMenu locale="en" method="paymob" />)
    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }))
    const accountLink = screen.getByRole("menuitem", { name: /my account/i })
    expect(accountLink.getAttribute("href")).toBe("/account")
  })

  it("the policies link points at /terms", () => {
    render(<UserMenu locale="en" method="paymob" />)
    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }))
    const policiesLink = screen.getByRole("menuitem", { name: /policies/i })
    expect(policiesLink.getAttribute("href")).toBe("/terms")
  })

  it("Escape closes it", () => {
    render(<UserMenu locale="en" method="paymob" />)
    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }))
    expect(screen.getByRole("menu")).not.toBeNull()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("the panel contains the language/theme/currency rows", () => {
    render(<UserMenu locale="en" method="paymob" />)
    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }))
    expect(screen.getByText("Language")).not.toBeNull()
    expect(screen.getByText("Appearance")).not.toBeNull()
    expect(screen.getByText("Currency")).not.toBeNull()
    expect(screen.getByTestId("locale-switcher")).not.toBeNull()
    expect(screen.getByTestId("currency-switcher")).not.toBeNull()
  })
})
