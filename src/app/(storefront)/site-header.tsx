"use client"
/**
 * Site header for the storefront layout with navigation, theme/locale controls, and a mobile menu.
 */
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Icon } from "@/app/icons"
import { CurrencySwitcher } from "@/app/currency-switcher"
import { LocaleSwitcher } from "@/app/locale-switcher"
import { ThemeToggle } from "@/app/theme-toggle"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import type { UrlMethod } from "@/app/urls"

const links = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/account", key: "nav.myAccount", icon: "user" },
] as const

export function SiteHeader({ locale, method }: { locale: Locale; method: UrlMethod }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href)
  const nav = links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="nav-link"
      aria-current={isActive(link.href) ? "page" : undefined}
      onClick={() => setOpen(false)}
    >
      <Icon name={link.icon} size={16} />
      {t(locale, link.key)}
    </Link>
  ))

  return (
    <>
      <header className="site-header">
        <div className="site-nav">
          <Link className="brand" href="/" onClick={() => setOpen(false)}>
            <img src="/logo-64.png" srcSet="/logo-64.png 1x, /logo-128.png 2x" alt="" width={47} height={32} decoding="async" />
          </Link>
          <nav className="ms-auto hidden items-center gap-1 md:flex">{nav}</nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <ThemeToggle label={t(locale, "theme.toggle")} />
            <LocaleSwitcher locale={locale} />
            <div className="hidden md:block">
              <CurrencySwitcher locale={locale} value={method} />
            </div>
            <button
              type="button"
              className="btn-icon md:hidden"
              onClick={() => setOpen(true)}
              aria-label={t(locale, "nav.menu")}
              aria-expanded={open}
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            aria-label={t(locale, "common.closeAria")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 flex w-[min(20rem,86vw)] animate-slide-in flex-col gap-3 border-s border-line bg-canvas p-5 shadow-e2">
            <div className="flex items-center justify-between">
              <Link className="brand" href="/" onClick={() => setOpen(false)}>
                <img src="/logo-64.png" srcSet="/logo-64.png 1x, /logo-128.png 2x" alt="" width={47} height={32} decoding="async" />
              </Link>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label={t(locale, "common.closeAria")}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2">
              <span className="text-xs font-bold text-muted">{t(locale, "common.preferredCurrency")}</span>
              <CurrencySwitcher locale={locale} value={method} />
            </div>
            <nav className="mt-4 flex flex-col gap-1">{nav}</nav>
            <div className="mt-auto rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs leading-relaxed text-muted">{t(locale, "footer.tagline")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="hud-chip"><span className="hud-dot" />{t(locale, "footer.delivery")}</span>
                <span className="hud-chip"><Icon name="shield" size={12} />{t(locale, "footer.secure")}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
