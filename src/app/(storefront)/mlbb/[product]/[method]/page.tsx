/**
 * MLBB top-up route for a product and payment method; renders the checkout form, player/profile fields, and order summary.
 */
import Link from "next/link"
import { notFound } from "next/navigation"
import { serverApi } from "@/frontend/server"
import type { StorefrontDto } from "@/api/contracts"
import { startCheckout } from "../../actions"
import { Icon, type IconName } from "@/app/icons"
import { Toast } from "@/app/toast"
import { Coin } from "@/app/coin"
import { ProfileFields } from "../../profile-fields"
import { MethodTabs } from "../../method-tabs"
import { TermsConsent } from "../../terms-consent"
import { isUrlMethod, methodToForm, slugify, topupPath, type UrlMethod } from "@/app/urls"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

const isDirectPayMethod = (method: UrlMethod) => method === "paymob" || method === "crypto"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ product: string; method: string }>
  searchParams: Promise<{ error?: string; userId?: string; serverId?: string }>
}) {
  const locale = await getLocale()
  const { product: productSlug, method } = await params
  const query = await searchParams

  if (!isUrlMethod(method)) {
    notFound()
  }

  const formMethod = methodToForm(method)
  const data = await (await serverApi()).get<StorefrontDto>("/api/storefront?audience=client")
  const product = data.products.find((item) => slugify(item.name) === productSlug)
  if (product === undefined) {
    notFound()
  }

  const signedIn = data.signedIn
  const profiles = data.profiles
  const gateways = data.gateways
  const paymobEnabled = gateways.card || gateways.wallet
  const coinsEnabled = gateways.coins
  const cryptoEnabled = gateways.crypto
  const methodLabel = method === "paymob" ? t(locale, "topup.methodInstapay") : method === "crypto" ? t(locale, "topup.methodCrypto") : t(locale, "topup.methodCoins")
  const total =
    method === "paymob"
      ? `${(product.egp.minor / 100).toFixed(2)} ${t(locale, "common.currency")}`
      : method === "crypto"
        ? `${(product.price.minor / 100).toFixed(2)} USDT`
        : ""

  const totalNode =
    method === "coins" ? (
      <span className="flex items-center gap-1.5">{product.coins}<Coin size={20} /></span>
    ) : (
      <span dir="ltr">{total}</span>
    )

  const needsLogin = method === "coins" && !signedIn
  const gatewayDisabled = method === "paymob" ? !paymobEnabled : method === "crypto" ? !cryptoEnabled : !coinsEnabled
  const directPayUnavailable = isDirectPayMethod(method) && product.directPayAvailable === false
  const productUnavailable = !product.buyable
  const unavailableText = product.unavailableReason === "insufficient_funds" && product.fundingGapMinor > 0
    ? t(locale, "topup.fundingGap", { amount: (product.fundingGapMinor / 100).toFixed(2) })
    : product.unavailableReason === "unknown_balance"
      ? t(locale, "topup.unavailableUnknown")
      : null

  return (
    <main className="page pb-32 lg:pb-24">
      {query.error === "terms" ? <Toast message={t(locale, "legal.consent.error")} tone="bad" /> : null}
      {query.error === "coins" ? <Toast message={t(locale, "topup.errorCoinsInsufficient")} tone="bad" /> : null}
      {query.error === "player" ? <Toast message={t(locale, "topup.errorPlayerCheck")} tone="bad" /> : null}
      {query.error === "coverage" ? <Toast message={t(locale, "topup.errorCoverage")} tone="bad" /> : null}
      {query.error === "unavailable" ? <Toast message={t(locale, "topup.errorUnavailable")} tone="bad" /> : null}
      {query.error === "payment" ? <Toast message={t(locale, "topup.errorPayment")} tone="bad" /> : null}
      {query.error?.startsWith("promo-") ? <Toast message={{ unknown: t(locale, "topup.errorPromoUnknown"), expired: t(locale, "topup.errorPromoExpired"), exhausted: t(locale, "topup.errorPromoExhausted"), inactive: t(locale, "topup.errorPromoInactive") }[query.error.slice("promo-".length)] ?? t(locale, "topup.errorPromoUnknown")} tone="bad" /> : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="btn btn-ghost btn-sm" href="/products">
          <span className="rtl:-scale-x-100"><Icon name="chevron-left" size={15} /></span>
          {t(locale, "common.backToCatalogue")}
        </Link>
        <span className="hud-chip"><Icon name="lock" size={12} />{t(locale, "topup.secureNote")}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <header>
            <p className="eyebrow"><Icon name="gem" size={12} />{t(locale, "home.diamonds")}</p>
            <h1 className="display-1 mt-3">{t(locale, "topup.title")}</h1>
            <p className="lede mt-3">{t(locale, "topup.lede")}</p>
          </header>

          <section className="mt-7">
            <h2 className="text-sm font-bold text-ink">{t(locale, "topup.chooseMethod")}</h2>
            <MethodTabs locale={locale} productName={product.name} method={method} gateways={gateways} />
          </section>

          {gatewayDisabled ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-e1">
              <p className="notice">{t(locale, "topup.errorMethodDisabled")}</p>
            </div>
          ) : productUnavailable ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-e1">
              <p className="notice">{t(locale, "topup.errorUnavailable")}</p>
              {unavailableText ? <p className="mt-2 text-sm text-muted">{unavailableText}</p> : null}
            </div>
          ) : directPayUnavailable ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-e1">
              <p className="notice">{t(locale, "topup.errorCoverage")}</p>
            </div>
          ) : needsLogin ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-e1">
              <p className="notice">{t(locale, "topup.needLoginCoins")}</p>
              <Link className="btn btn-primary mt-4" href={"/account/login?next=" + encodeURIComponent(topupPath(product.name, method))}>
                <Icon name="user" size={15} /> {t(locale, "topup.login")}
              </Link>
            </div>
          ) : (
            <form id="checkout-form" action={startCheckout} className="mt-6 stack">
              <input type="hidden" name="product" value={product.id} />
              <input type="hidden" name="method" value={formMethod} />
              <input type="hidden" name="returnTo" value={topupPath(product.name, method)} />

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-ink">{t(locale, "topup.step.player")}</h2>
                  <span className="hud-chip"><Icon name="shield" size={12} />{t(locale, "topup.verified")}</span>
                </div>
                <div className="mt-4">
                  <ProfileFields
                    locale={locale}
                    profiles={profiles}
                    defaultUserId={query.userId ?? ""}
                    defaultServerId={query.serverId ?? ""}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
                <label className="field">
                  <span className="field-label">{t(locale, "topup.promoCodeOptional")}</span>
                  <input name="promoCode" type="text" dir="ltr" autoComplete="off" />
                </label>
              </div>

              <TermsConsent locale={locale} />

              {method === "coins" && signedIn ? <p className="text-xs text-muted">{t(locale, "topup.coinsDeducted")}</p> : null}
            </form>
          )}
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="summary">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink">{t(locale, "topup.summary")}</h2>
              <Coin size={20} />
            </div>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <span>{t(locale, "topup.product")}</span>
                <strong>{product.name}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{t(locale, "topup.paymentMethod")}</span>
                <strong>{methodLabel}</strong>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="card-kicker">{t(locale, "topup.total")}</p>
              <p className="price mt-1">{totalNode}</p>
              {method === "coins" && signedIn ? <p className="mt-2 text-xs text-muted">{t(locale, "topup.coinsDeducted")}</p> : null}
            </div>

            {gatewayDisabled || productUnavailable || directPayUnavailable ? null : needsLogin ? (
              <div className="mt-4 grid gap-3">
                <p className="notice">{t(locale, "topup.needLoginCoins")}</p>
                <Link className="btn btn-primary btn-block" href={"/account/login?next=" + encodeURIComponent(topupPath(product.name, method))}>
                  <Icon name="user" size={15} /> {t(locale, "topup.login")}
                </Link>
              </div>
            ) : (
              <SubmitButton className="btn btn-primary btn-block mt-4" form="checkout-form">
                <Icon name="bolt" size={16} /> {t(locale, "topup.continueToPayment")}
              </SubmitButton>
            )}

            <p className="mt-3 flex items-center gap-2 text-[11px] leading-relaxed text-muted">
              <Icon name="lock" size={13} /> {t(locale, "topup.secureNote")}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {paymobEnabled ? <span className="hud-chip justify-center"><Icon name="card" size={11} />{t(locale, "home.methodInstapay")}</span> : null}
            {cryptoEnabled ? <span className="hud-chip justify-center"><Icon name="crypto" size={11} />{t(locale, "home.methodCrypto")}</span> : null}
            {coinsEnabled ? <span className="hud-chip justify-center"><Icon name="coins" size={11} />{t(locale, "home.methodCoins")}</span> : null}
          </div>
        </aside>
      </div>

      {!gatewayDisabled && !productUnavailable && !directPayUnavailable && !needsLogin ? (
        <div className="mobile-cta lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="card-kicker">{t(locale, "topup.total")}</p>
              <p className="amount text-lg font-bold">{totalNode}</p>
            </div>
            <SubmitButton className="btn btn-primary" form="checkout-form">
              {t(locale, "topup.continueToPayment")}
            </SubmitButton>
          </div>
        </div>
      ) : null}
    </main>
  )
}
