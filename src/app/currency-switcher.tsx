"use client"
/**
 * Header control for the visitor's preferred default payment currency. Writes the
 * `default_method` cookie and refreshes the router so server components re-render
 * their prices with the new default.
 */
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/app/icons"
import { Spinner } from "@/app/skeleton"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { isUrlMethod, type UrlMethod } from "@/app/urls"

export function CurrencySwitcher({ locale, value }: { locale: Locale; value: UrlMethod }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const options: ReadonlyArray<{ readonly id: UrlMethod; readonly label: string }> = [
    { id: "instapay", label: t(locale, "common.currency") },
    { id: "crypto", label: "USDT" },
    { id: "coins", label: t(locale, "common.currencyCoins") },
  ]

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label={t(locale, "common.preferredCurrency")}
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (!isUrlMethod(next)) return
          document.cookie = `default_method=${next}; path=/; max-age=31536000; samesite=lax`
          startTransition(() => {
            router.refresh()
          })
        }}
        disabled={pending}
        aria-busy={pending || undefined}
        className="currency-switch disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-muted">
        {pending ? <Spinner className="h-3 w-3" /> : <Icon name="chevron-down" size={13} />}
      </span>
    </span>
  )
}
