"use client"

import { useRef, useState } from "react"
import { Icon } from "@/app/icons"
import { Coin } from "@/app/coin"
import { SubmitButton } from "@/app/submit-button"
import { majorToMinor } from "@/shared/money"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { startFunding } from "../fund/actions"

type Quote = {
  currency: string
  amountMinor: number
  rateMinor: number
  coins: number
  egpValueMinor: number
}

function errorMessage(locale: Locale, code: string): string {
  if (code === "rate") return t(locale, "account.fundErrorRate")
  if (code === "coverage") return t(locale, "account.fundErrorCoverage")
  if (code === "balance") return t(locale, "account.fundErrorBalance")
  return t(locale, "account.fundErrorAmount")
}

export function FundWalletDialog({
  locale,
  className = "btn btn-primary",
}: {
  readonly locale: Locale
  readonly className?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [currency, setCurrency] = useState<"EGP" | "USD">("EGP")
  const [amount, setAmount] = useState("")
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onCurrencyChange = (next: "EGP" | "USD") => {
    setCurrency(next)
    setQuote(null)
    setError(null)
  }

  const onAmountChange = (next: string) => {
    setAmount(next)
    setQuote(null)
    setError(null)
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const major = Number(amount)
    if (!Number.isFinite(major) || major <= 0) {
      setError(errorMessage(locale, "amount"))
      return
    }
    const minor = majorToMinor(major, currency)
    if (!Number.isSafeInteger(minor) || minor <= 0) {
      setError(errorMessage(locale, "amount"))
      return
    }
    setPending(true)
    try {
      const res = await fetch(
        `/api/account/fund?currency=${currency}&amountMinor=${minor}`,
        { cache: "no-store" },
      )
      if (res.status === 401) {
        window.location.href = "/account/login"
        return
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setQuote(null)
        setError(errorMessage(locale, (body as { error?: string }).error ?? "amount"))
        return
      }
      setQuote(body as Quote)
      setError(null)
    } catch {
      setError(errorMessage(locale, "amount"))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialog.current?.showModal()}
      >
        <Icon name="wallet" size={15} /> {t(locale, "account.fundWallet")}
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{t(locale, "account.fundTitle")}</h2>
          <button
            type="button"
            className="btn-icon"
            aria-label={t(locale, "common.close")}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 stack">
          <div className="field">
            <label htmlFor="fund-currency">{t(locale, "account.fundCurrency")}</label>
            <select
              id="fund-currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as "EGP" | "USD")}
            >
              <option value="EGP">{t(locale, "account.fundEgp")}</option>
              <option value="USD">{t(locale, "account.fundUsd")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fund-amount">{t(locale, "account.fundAmount")}</label>
            <input
              id="fund-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {t(locale, "account.fundGetQuote")}
          </button>
        </form>

        {error ? <p className="alert mt-4">{error}</p> : null}

        {quote ? (
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <dl className="grid gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="card-kicker">{t(locale, "account.fundAmount")}</dt>
                <dd className="amount" dir="ltr">
                  {(quote.amountMinor / 100).toFixed(2)} {quote.currency}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="card-kicker">{t(locale, "account.fundRate")}</dt>
                <dd className="amount" dir="ltr">
                  {(quote.rateMinor / 100).toFixed(2)} {quote.currency}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="card-kicker">{t(locale, "account.fundYouGet")}</dt>
                <dd className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                  <span className="num">{quote.coins}</span>
                  <span>{t(locale, "account.coinUnit")}</span>
                  <Coin size={18} />
                </dd>
              </div>
            </dl>
            <p className="hint mt-4">{t(locale, "account.fundSandboxNote")}</p>

            <form action={startFunding} className="mt-4">
              <input type="hidden" name="currency" value={quote.currency} />
              <input type="hidden" name="amountMinor" value={String(quote.amountMinor)} />
              <SubmitButton className="btn btn-primary btn-block min-h-12">
                {t(locale, "account.fundPayNow")}
              </SubmitButton>
            </form>
          </section>
        ) : null}
      </dialog>
    </>
  )
}
