/**
 * Fake checkout route at /checkout/fake/[reference]: renders test payment details for a reference.
 * Provides the pay action and returns not found when the payment reference is missing.
 */
import Link from "next/link"
import { notFound } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { PaymentPageDto } from "@/api/contracts"
import { payFake } from "./actions"
import { Icon, type IconName } from "@/app/icons"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const locale = await getLocale()
  const { reference } = await params
  const { token } = await searchParams

  const payment = await (await serverApi())
    .get<PaymentPageDto & { readonly purpose?: "order" | "funding" }>(`/api/payments/fake/${encodeURIComponent(reference)}`)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound()
      throw error
    })

  const providerIcon: IconName = payment.provider === "INSTAPAY" ? "card" : payment.provider === "CRYPTO" ? "crypto" : "coins"
  const providerLabel =
    payment.provider === "INSTAPAY"
      ? t(locale, "account.instapay")
      : payment.provider === "CRYPTO"
        ? t(locale, "account.crypto")
        : t(locale, "account.coins")
  const amount = (payment.amount.minor / 100).toFixed(2)

  return (
    <main className="page">
      <div className="mx-auto w-full max-w-xl">
        <Link className="btn btn-ghost btn-sm" href="/products">
          <span className="rtl:-scale-x-100"><Icon name="chevron-left" size={15} /></span>
          {t(locale, "common.backToCatalogue")}
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-e2">
          <div className="ember-seam h-1" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eyebrow"><Icon name="lock" size={12} />{t(locale, "account.secureCheckout")}</span>
              <span className="hud-chip"><span className="hud-dot" />{t(locale, "account.testMode")}</span>
            </div>

            <h1 className="display-2 mt-4">{t(locale, "account.fakeCheckoutTitle")}</h1>
            {payment.purpose === "funding" ? (
              <p className="lede mt-2 text-sm sm:text-base">تمويل محفظة 67 كوينز</p>
            ) : null}
            <p className="lede mt-2 text-sm sm:text-base">{t(locale, "account.fakeCheckoutLede")}</p>

            <div className="mt-6 rounded-2xl border border-line bg-raised/50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-line bg-surface text-ember">
                  <Icon name={providerIcon} size={22} />
                </span>
                <div className="min-w-0">
                  <p className="card-kicker">{t(locale, "account.paymentMethod")}</p>
                  <p className="truncate text-sm font-bold text-ink">{providerLabel}</p>
                </div>
                <span className="ms-auto hud-chip">{t(locale, "account.testMode")}</span>
              </div>

              <p className="card-kicker mt-5">{t(locale, "account.amount")}</p>
              <p className="price mt-1">
                <span dir="ltr">{amount}</span>
                <span className="text-lg font-bold text-muted">{payment.amount.currency}</span>
              </p>
            </div>

            <dl className="mt-4 grid gap-2 rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-semibold text-muted">{t(locale, "account.reference")}</dt>
                <dd className="num text-xs font-bold text-ink" dir="ltr">{reference}</dd>
              </div>
            </dl>

            <form action={payFake} className="mt-6 stack">
              <input type="hidden" name="reference" value={reference} />
              <input type="hidden" name="token" value={token ?? ""} />
              <SubmitButton className="btn btn-primary btn-block min-h-12">
                <Icon name="lock" size={16} />
                {t(locale, "account.payAmount")}
              </SubmitButton>
              <p className="text-center text-[11px] leading-relaxed text-muted">{t(locale, "account.checkoutNote")}</p>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="hud-chip"><Icon name="shield" size={12} />{t(locale, "topup.secureNote")}</span>
          <span className="hud-chip"><Icon name="check-circle" size={12} />{t(locale, "account.testMode")}</span>
        </div>
      </div>
    </main>
  )
}
