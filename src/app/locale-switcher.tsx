"use client"
/**
 * Client control that toggles the UI locale between Arabic and English. Writes
 * the `locale` cookie and refreshes the router to apply the new locale.
 */
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/app/skeleton"
import type { Locale } from "@/i18n/locale"

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const target: Locale = locale === "ar" ? "en" : "ar"
  const label = locale === "ar" ? "English" : "العربية"
  const ariaLabel = locale === "ar" ? "التبديل إلى الإنجليزية" : "التبديل إلى العربية"

  const onClick = () => {
    document.cookie = `locale=${target}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      className="locale-switch disabled:opacity-60"
      onClick={onClick}
      lang={target}
      aria-label={ariaLabel}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      <span className="inline-flex items-center gap-1.5">{pending ? <Spinner className="h-3 w-3" /> : null}{label}</span>
    </button>
  )
}
