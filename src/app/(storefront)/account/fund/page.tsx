/**
 * Fund wallet route at /account/fund: renders the wallet funding quote form
 * and, when a quote is available, the pay form. Returns not found when the
 * account or sandbox funding is unavailable.
 */
import { notFound } from "next/navigation"
import { getAccount } from "@/frontend/account"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import { majorToMinor } from "@/shared/money"
import { Icon } from "@/app/icons"
import { Coin } from "@/app/coin"
import { SubmitButton } from "@/app/submit-button"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { startFunding } from "./actions"

export const dynamic = "force-dynamic"

type Quote = {
  readonly currency: string
  readonly amountMinor: number
  readonly rateMinor: number
  readonly coins: number
  readonly egpValueMinor: number
}

function errorMessage(locale: Locale, code: string): string {
  if (code === "rate") return t(locale, "account.fundErrorRate")
  if (code === "coverage") return t(locale, "account.fundErrorCoverage")
  if (code === "balance") return t(locale, "account.fundErrorBalance")
  return t(locale, "account.fundErrorAmount")
}

export default async function FundPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; amount?: string; error?: string }>
}) {
  const params = await searchParams
  const locale = await getLocale()
  const account = await getAccount()
  if (account === null) {
    notFound()
  }
  if (!account.fundingAvailable) {
    notFound()
  }

  const currency: "EGP" | "USD" = params.currency === "USD" ? "USD" : "EGP"
  const amount = (params.amount ?? "").trim()
  let error: string | null = null
  let quote: Quote | null = null

  if (params.error !== undefined) {
    error = errorMessage(locale, params.error)
  } else if (amount !== "") {
    let minor: number | null = null
    try {
      const major = Number(amount)
      if (!Number.isFinite(major) || major <= 0) throw new RangeError()
      minor = majorToMinor(major, currency)
      if (!Number.isSafeInteger(minor) || minor <= 0) throw new RangeError()
    } catch (err) {
      if (err instanceof RangeError) {
        error = errorMessage(locale, "amount")
      } else {
        throw err
      }
    }
    if (minor !== null && error === null) {
      try {
        quote = await (await serverApi()).get<Quote>(
          `/api/account/fund?currency=${currency}&amountMinor=${minor}`,
        )
      } catch (err) {
        if (err instanceof ApiError) {
          error = errorMessage(locale, err.code)
        } else {
          throw err
        }
      }
    }
  }

  return (
    <main className="page">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <p className="eyebrow"><Icon name="wallet" size={12} />{t(locale, "account.fundTitle")}</p>
          <h1 className="display-2 mt-3">{t(locale, "account.fundTitle")}</h1>
          <p className="lede mt-2 text-sm sm:text-base">{t(locale, "account.fundLede")}</p>
        </header>

        {error ? <div className="alert mt-4">{error}</div> : null}

        <form method="get" action="/account/fund" className="mt-6 stack">
          <div className="field">
            <label htmlFor="currency">{t(locale, "account.fundCurrency")}</label>
            <select id="currency" name="currency" defaultValue={currency}>
              <option value="EGP">{t(locale, "account.fundEgp")}</option>
              <option value="USD">{t(locale, "account.fundUsd")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="amount">{t(locale, "account.fundAmount")}</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              defaultValue={amount}
            />
          </div>
          <SubmitButton className="btn btn-primary">
            {t(locale, "account.fundGetQuote")}
          </SubmitButton>
        </form>

        {amount === "" ? <p className="hint mt-4">{t(locale, "account.fundEnterAmount")}</p> : null}

        {quote !== null ? (
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
      </div>
    </main>
  )
}
