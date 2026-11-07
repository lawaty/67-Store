"use client"
/**
 * Dismissible toast notification that auto-hides after 5 seconds and announces status to assistive tech.
 */

import { useEffect, useState } from "react"
import { Icon } from "./icons"
import type { Locale } from "@/i18n/locale"
import { t } from "@/i18n/dictionary"

export function Toast({ message, tone = "ok", locale = "ar" }: { message: string; tone?: "ok" | "bad"; locale?: Locale }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-x-4 top-24 z-[60] mx-auto flex max-w-md animate-slide-in items-start gap-3 rounded-xl border bg-surface/95 px-4 py-3 text-sm font-semibold shadow-e2 backdrop-blur-xl ${
        tone === "ok" ? "border-jade/40 text-jade" : "border-danger/40 text-danger"
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon name={tone === "ok" ? "check-circle" : "alert"} size={18} />
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        type="button"
        className="rounded-md p-0.5 opacity-70 transition hover:opacity-100"
        onClick={() => setVisible(false)}
        aria-label={t(locale, "common.closeAria")}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}
