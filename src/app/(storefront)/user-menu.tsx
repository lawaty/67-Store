"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CurrencySwitcher } from "@/app/currency-switcher"
import { LocaleSwitcher } from "@/app/locale-switcher"
import { ThemeToggle } from "@/app/theme-toggle"
import { Icon } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import type { UrlMethod } from "@/app/urls"
import { brand } from "@/shared/brand"

export function UserMenu({ locale, method }: { locale: Locale; method: UrlMethod }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t(locale, "header.menu")}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-ink">
          {brand.name?.[0] || <Icon name="user" size={18} />}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full mt-2 w-[min(18rem,85vw)] rounded-2xl border border-line bg-canvas p-3 shadow-e2"
        >
          <div className="mb-2 px-1 py-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {t(locale, "header.settings")}
          </div>
          <Link
            href="/account"
            role="menuitem"
            className="nav-link w-full justify-start"
            onClick={close}
          >
            <Icon name="user" size={16} />
            {t(locale, "nav.myAccount")}
          </Link>
          <Link
            href="/terms"
            role="menuitem"
            className="nav-link w-full justify-start"
            onClick={close}
          >
            <Icon name="help" size={16} />
            {t(locale, "header.policies")}
          </Link>
          <div className="my-2 h-px bg-line" />
          <div className="flex flex-col gap-2 px-1 py-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{t(locale, "header.language")}</span>
              <LocaleSwitcher locale={locale} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{t(locale, "header.theme")}</span>
              <ThemeToggle label={t(locale, "theme.toggle")} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{t(locale, "header.currency")}</span>
              <CurrencySwitcher locale={locale} value={method} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
