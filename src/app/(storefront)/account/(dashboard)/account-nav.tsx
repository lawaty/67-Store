"use client"
/**
 * Account sidebar navigator: derives the active section from the pathname and
 * the ?tab= search param so /account?tab=… and /account/profiles share one nav.
 */
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Icon, type IconName } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

type AccountSection = "wallet" | "orders" | "profiles" | "levels"

export function AccountNav({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab")

  const active: AccountSection =
    pathname === "/account/profiles"
      ? "profiles"
      : tab === "orders" || tab === "profiles" || tab === "levels"
        ? tab
        : "profiles"

  const items: { key: AccountSection; label: string; icon: IconName; href: string }[] = [
    { key: "wallet", label: t(locale, "account.tabs.wallet"), icon: "wallet", href: "/account?tab=wallet" },
    { key: "orders", label: t(locale, "account.tabs.orders"), icon: "receipt", href: "/account?tab=orders" },
    { key: "profiles", label: t(locale, "account.tabs.profiles"), icon: "user", href: "/account/profiles" },
    { key: "levels", label: t(locale, "account.tabs.levels"), icon: "sparkles", href: "/account?tab=levels" },
  ]

  return (
    <nav className="account-nav" aria-label={t(locale, "account.title")}>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} aria-current={active === item.key ? "page" : undefined}>
              <Icon name={item.icon} size={16} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
