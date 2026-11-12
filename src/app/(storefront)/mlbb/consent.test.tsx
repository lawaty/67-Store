// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup, screen } from "@testing-library/react"

import { TermsConsent } from "./terms-consent"

afterEach(() => {
  cleanup()
})

describe("TermsConsent", () => {
  it("renders required terms consent checkbox with correct links and note", () => {
    render(<TermsConsent locale="en" />)

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement
    expect(checkbox).not.toBeNull()
    expect(checkbox.getAttribute("name")).toBe("termsAccepted")
    expect(checkbox.required).toBe(true)
    expect(checkbox.getAttribute("id")).toBe("terms-accepted")

    const label = document.querySelector('label[for="terms-accepted"]')
    expect(label).not.toBeNull()

    const termsLink = screen.getByRole("link", { name: "Terms of use" }) as HTMLAnchorElement
    expect(termsLink.getAttribute("href")).toBe("/terms")

    const refundLink = screen.getByRole("link", { name: "Refund policy" }) as HTMLAnchorElement
    expect(refundLink.getAttribute("href")).toBe("/refund-policy")

    expect(
      screen.getByText("Digital goods are delivered to the player ID you enter, usually within 15 minutes.")
    ).not.toBeNull()
  })
})
