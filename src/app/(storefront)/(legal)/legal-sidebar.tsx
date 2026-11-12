"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LEGAL_ROUTES, type LegalRouteKey } from "@/shared/legal"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

const ORDER: LegalRouteKey[] = ["terms", "privacy", "refund", "delivery", "cookies", "contact"]

export function LegalSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={t(locale, "legal.nav.heading")}
      className="lg:sticky lg:top-28"
    >
      <p className="eyebrow">{t(locale, "legal.nav.heading")}</p>
      <ul className="mt-3 flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ORDER.map((key) => {
          const href = LEGAL_ROUTES[key]
          const isCurrent = pathname === href
          return (
            <li key={key} className="shrink-0 lg:shrink">
              <Link
                href={href}
                className={
                  isCurrent
                    ? "hud-chip w-full justify-start border-accent/40 bg-accent/10 text-accent"
                    : "hud-chip w-full justify-start"
                }
                aria-current={isCurrent ? "page" : undefined}
              >
                {t(locale, `legal.nav.${key}` as const)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
