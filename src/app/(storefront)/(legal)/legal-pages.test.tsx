// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { LegalPage, type LegalPageSlug } from "./legal-page"
import { ar } from "@/i18n/messages/legal"

afterEach(() => {
  cleanup()
})

const slugs: { slug: LegalPageSlug; sections: number }[] = [
  { slug: "terms", sections: 7 },
  { slug: "privacy", sections: 8 },
  { slug: "refund", sections: 6 },
  { slug: "delivery", sections: 5 },
  { slug: "cookies", sections: 5 },
  { slug: "contact", sections: 4 },
]

describe("legal pages", () => {
  for (const { slug, sections } of slugs) {
    it(`renders ${slug} with correct h1, section count, and mailto`, async () => {
      const ui = await LegalPage({ slug, locale: "ar" })
      const { container } = render(ui)

      const h1 = screen.getByRole("heading", { level: 1 })
      expect(h1.textContent).toBe(ar[`legal.${slug}.title` as keyof typeof ar])
      expect(container.querySelectorAll("h1")).toHaveLength(1)

      const h2s = container.querySelectorAll("h2")
      // section headings + "questions" heading
      expect(h2s.length).toBe(sections + 1)

      const mailto = container.querySelector('a[href="mailto:support@67-store.online"]')
      expect(mailto).not.toBeNull()
      expect(mailto?.textContent).toBe(ar["legal.common.emailUs"])
    })
  }
})
