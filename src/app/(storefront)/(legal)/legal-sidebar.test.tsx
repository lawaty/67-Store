// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { LegalSidebar } from "./legal-sidebar"
import { LEGAL_ROUTES } from "@/shared/legal"

vi.mock("next/navigation", () => ({
  usePathname: () => "/privacy",
}))

afterEach(() => {
  cleanup()
})

describe("LegalSidebar", () => {
  it("renders heading, exactly six links with expected hrefs in order, and active privacy link", () => {
    render(<LegalSidebar locale="ar" />)

    expect(screen.getByText("السياسات")).toBeTruthy()

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(6)

    const expectedHrefs = [
      LEGAL_ROUTES.terms,
      LEGAL_ROUTES.privacy,
      LEGAL_ROUTES.refund,
      LEGAL_ROUTES.delivery,
      LEGAL_ROUTES.cookies,
      LEGAL_ROUTES.contact,
    ]
    expect(links.map((l) => l.getAttribute("href"))).toEqual(expectedHrefs)

    const privacy = links.find((l) => l.getAttribute("href") === "/privacy")
    expect(privacy?.getAttribute("aria-current")).toBe("page")

    const nonPrivacy = links.filter((l) => l.getAttribute("href") !== "/privacy")
    for (const link of nonPrivacy) {
      expect(link.getAttribute("aria-current")).toBeNull()
    }
  })
})
