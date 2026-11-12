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
import { brand } from "@/shared/brand"
import { LEGAL_ROUTES } from "@/shared/legal"
import { UserMenu } from "@/app/(storefront)/user-menu"

const links = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: LEGAL_ROUTES.contact, key: "legal.header.contact", icon: "help" },
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
            <img src={brand.logo64} srcSet={`${brand.logo64} 1x, ${brand.logo128} 2x`} alt="" width={47} height={32} decoding="async" />
          </Link>
          <nav className="ms-auto hidden items-center gap-1 md:flex">{nav}</nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <UserMenu locale={locale} method={method} />
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
                <img src={brand.logo64} srcSet={`${brand.logo64} 1x, ${brand.logo128} 2x`} alt="" width={47} height={32} decoding="async" />
              </Link>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label={t(locale, "common.closeAria")}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav className="mt-2 flex flex-col gap-1">{nav}</nav>
            <div className="flex flex-col gap-1">
              <Link href="/account" className="nav-link" onClick={() => setOpen(false)}>
                <Icon name="user" size={16} />
                {t(locale, "nav.myAccount")}
              </Link>
              <Link href="/terms" className="nav-link" onClick={() => setOpen(false)}>
                <Icon name="help" size={16} />
                {t(locale, "header.policies")}
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{t(locale, "header.settings")}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-muted">{t(locale, "header.language")}</span>
                  <LocaleSwitcher locale={locale} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-muted">{t(locale, "header.theme")}</span>
                  <ThemeToggle label={t(locale, "theme.toggle")} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-muted">{t(locale, "common.preferredCurrency")}</span>
                  <CurrencySwitcher locale={locale} value={method} />
                </div>
              </div>
            </div>
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
