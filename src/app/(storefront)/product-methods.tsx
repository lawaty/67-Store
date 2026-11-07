"use client"
/**
 * Client selector for a product's payment method that shows its price and links to the top-up route.
 */
import Link from "next/link"
import { useEffect, useState } from "react"
import { Coin } from "@/app/coin"
import { Icon } from "@/app/icons"

export type ProductMethodOption = {
  readonly id: string
  readonly label: string
  readonly href: string
  readonly price: string
  readonly coinAmount?: number
  readonly disabled?: boolean
  readonly reason?: string
  readonly fundingGapMinor?: number
}

export function ProductMethods({
  options,
  label,
  ctaLabel,
  defaultId,
  showCtaLabel = false,
}: {
  options: readonly ProductMethodOption[]
  label: string
  ctaLabel: string
  defaultId?: string
  showCtaLabel?: boolean
}) {
  const [active, setActive] = useState(() => {
    const preferred = defaultId === undefined ? undefined : options.find((option) => option.id === defaultId)
    if (preferred !== undefined) return preferred.id
    return options.find((option) => !option.disabled)?.id ?? options[0]?.id ?? ""
  })
  useEffect(() => {
    if (defaultId === undefined) return
    const preferred = options.find((option) => option.id === defaultId)
    if (preferred !== undefined) {
      setActive(preferred.id)
      return
    }
    setActive(options.find((option) => !option.disabled)?.id ?? options[0]?.id ?? "")
    // Re-apply only when the default changes; the default wins even when disabled, and a manual pick is preserved in between.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultId])
  const selected = options.find((option) => option.id === active) ?? options[0]
  if (selected === undefined) return null
  const fundingGap = selected.fundingGapMinor !== undefined && selected.fundingGapMinor > 0
    ? `${(selected.fundingGapMinor / 100).toFixed(2)} USDT`
    : null
  const detail = [selected.reason, fundingGap].filter((value): value is string => Boolean(value)).join(" · ")

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5">
      <div className="relative min-w-0 flex-1">
        <select
          aria-label={label}
          value={selected.id}
          onChange={(event) => setActive(event.target.value)}
          onMouseDown={(event) => {
            if (typeof event.currentTarget.showPicker === "function") {
              event.preventDefault()
              event.currentTarget.focus()
            }
          }}
          onClick={(event) => {
            if (typeof event.currentTarget.showPicker !== "function") return
            try {
              event.currentTarget.showPicker()
            } catch {
              // ignore NotAllowedError
            }
          }}
          className="h-11 w-full appearance-none rounded-lg bg-raised/70 ps-3 pe-8 text-sm font-bold text-ink outline-none transition hover:bg-raised focus-visible:ring-2 focus-visible:ring-sky-strong/40"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="chevron-down" size={13} />
        </span>
      </div>
      <span className="amount flex shrink-0 items-center gap-1 text-sm font-extrabold text-ink" dir="ltr" aria-live="polite">
        {selected.coinAmount === undefined ? selected.price : <>{selected.coinAmount}<Coin size={14} /></>}
      </span>
      {selected.disabled ? (
        <button
          type="button"
          disabled
          aria-label={ctaLabel}
          title={detail || undefined}
          className={showCtaLabel
            ? "flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-ember/45 px-3 text-sm font-bold text-on-ember/80"
            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ember/45 text-on-ember/80"}
        >
          {showCtaLabel ? <span>{ctaLabel}</span> : null}
          <span className="rtl:-scale-x-100"><Icon name="arrow-right" size={15} /></span>
        </button>
      ) : (
        <Link
          href={selected.href}
          aria-label={ctaLabel}
          className={showCtaLabel
            ? "flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-ember px-3 text-sm font-bold text-on-ember transition hover:brightness-110"
            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ember text-on-ember transition hover:brightness-110"}
        >
          {showCtaLabel ? <span>{ctaLabel}</span> : null}
          <span className="rtl:-scale-x-100"><Icon name="arrow-right" size={15} /></span>
        </Link>
      )}
      </div>
      {detail ? <p className="mt-2 text-xs font-semibold text-muted" aria-live="polite">{detail}</p> : null}
    </div>
  )
}
