/**
 * Storefront landing route; renders a compact hero, a diamond selector, and a short bundles preview.
 */
import Link from "next/link"
import { serverApi } from "@/frontend/server"
import type { StorefrontDto } from "@/api/contracts"
import { topupPath } from "@/app/urls"
import { Icon } from "@/app/icons"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { methodAvailable, partitionProducts, priceFor } from "./catalogue"
import { ProductMethods, type ProductMethodOption } from "./product-methods"
import { PageGlow } from "./page-glow"
import { readPreferredMethod } from "./preferred-method"
import { Coin } from "@/app/coin"

export const dynamic = "force-dynamic"

export default async function Page() {
  const locale = await getLocale()
  const { products, defaultMethod, gateways, signedIn } = await (await serverApi()).get<StorefrontDto>("/api/storefront")
  const { diamonds, bundles } = partitionProducts(products)
  const preferred = await readPreferredMethod()
  const method = preferred ?? defaultMethod
  const currency = t(locale, "common.currency")
  const paymobEnabled = gateways.card || gateways.wallet
  const coinsEnabled = gateways.coins
  const cryptoEnabled = gateways.crypto
  const offeredMethodIds = [
    ...(paymobEnabled ? ["paymob" as const] : []),
    ...(coinsEnabled ? ["coins" as const] : []),
    ...(cryptoEnabled ? ["crypto" as const] : []),
  ]
  const selectedMethod = offeredMethodIds.includes(method) ? method : (offeredMethodIds[0] ?? method)

  const unavailableReason = (product: (typeof diamonds)[number]) => {
    if (methodAvailable(product, selectedMethod, signedIn)) return undefined
    if (selectedMethod === "coins") {
      return product.coinsGap > 0
        ? t(locale, "topup.coinsGap", { amount: String(product.coinsGap) })
        : t(locale, "home.unavailableUnknown")
    }
    if (product.unavailableReason === "insufficient_funds" && product.fundingGapMinor > 0) {
      return t(locale, "home.fundingGap", { amount: (product.fundingGapMinor / 100).toFixed(2) })
    }
    return t(locale, "home.unavailableUnknown")
  }

  const diamondOptions: ProductMethodOption[] = diamonds.map((product) => {
    const available = methodAvailable(product, selectedMethod, signedIn)
    const display = priceFor(product, selectedMethod, currency)
    const priceLabel =
      display.coinAmount !== undefined
        ? `${display.coinAmount} ${t(locale, "common.currencyCoins")}`
        : display.price
    return {
      id: product.name,
      label: `${product.name} — ${priceLabel}`,
      href: topupPath(product.name, selectedMethod),
      price: display.price,
      coinAmount: display.coinAmount,
      disabled: !available,
      reason: unavailableReason(product),
      fundingGapMinor: available || selectedMethod === "coins" ? undefined : product.fundingGapMinor,
    }
  })

  const featuredBundles = bundles.slice(0, 3)

  return (
    <main className="page relative">
      <PageGlow />
      <div className="relative z-10">
        <section className="hero-stage relative isolate overflow-hidden rounded-3xl border border-line bg-surface/60 p-6 sm:p-10">
          <div className="stagger relative z-10">
          <p className="eyebrow">
            <Icon name="bolt" size={13} />
            {t(locale, "home.eyebrow")}
          </p>
          <h1 className="display-1 ink-gradient mt-4">{t(locale, "home.hero.title")}</h1>
          <p className="lede mt-4">{t(locale, "home.hero.lede")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="btn btn-primary cta-sheen" href="#diamonds">
              {t(locale, "home.selectDiamond")}
            </a>
            <Link className="btn btn-ghost group" href="/products">
              {t(locale, "home.viewAll")}
              <span className="inline-flex transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1">
                <Icon name="arrow-right" size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section id="diamonds" className="section animate-fade-up scroll-mt-28 [animation-delay:350ms]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display-2 flex items-center gap-3">
            <span className="ember-seam h-6 w-1 rounded-full" aria-hidden="true" />
            {t(locale, "home.diamonds")}
          </h2>
          <span className="hud-chip">{diamonds.length}</span>
        </div>
        {diamonds.length === 0 ? (
          <p className="empty mt-6">{t(locale, "home.empty")}</p>
        ) : (
          <div className="card card-lift mt-6">
            <div className="card-body">
              <p className="text-sm font-bold text-ink">{t(locale, "home.selectDiamond")}</p>
              <ProductMethods
                options={diamondOptions}
                label={t(locale, "home.selectDiamond")}
                ctaLabel={t(locale, "home.cta.topup")}
                defaultId={(diamonds.find((diamond) => methodAvailable(diamond, selectedMethod, signedIn)) ?? diamonds[0]).name}
                showCtaLabel
              />
            </div>
          </div>
        )}
      </section>

      <section className="section animate-fade-up [animation-delay:450ms]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display-2 flex items-center gap-3">
            <span className="ember-seam h-6 w-1 rounded-full" aria-hidden="true" />
            {t(locale, "home.packs")}
          </h2>
          <span className="hud-chip">{bundles.length}</span>
        </div>
        {bundles.length === 0 ? (
          <p className="empty mt-6">{t(locale, "home.empty")}</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBundles.map((product) => {
              const available = methodAvailable(product, selectedMethod, signedIn)
              const display = priceFor(product, selectedMethod, currency)
              return (
              <div key={product.id} className={`card group ${available ? "card-lift" : "opacity-80"}`}>
                <div className="card-body">
                  <div className="flex items-start justify-between gap-2">
                    <p className="card-amount card-amount-text">{product.name}</p>
                    {!available ? <span className="badge">{t(locale, "home.unavailable")}</span> : null}
                  </div>
                  <p className="amount mt-2 text-xl font-extrabold transition-colors duration-300 group-hover:text-ember" dir="ltr">
                    {display.coinAmount === undefined ? display.price : <>{display.coinAmount}<Coin size={14} /></>}
                  </p>
                  {!available ? (
                    <p className="mt-2 text-xs font-semibold text-muted">
                      {selectedMethod === "coins"
                        ? product.coinsGap > 0
                          ? t(locale, "topup.coinsGap", { amount: String(product.coinsGap) })
                          : t(locale, "home.unavailableUnknown")
                        : product.unavailableReason === "insufficient_funds" && product.fundingGapMinor > 0
                          ? t(locale, "home.fundingGap", { amount: (product.fundingGapMinor / 100).toFixed(2) })
                          : t(locale, "home.unavailableUnknown")}
                    </p>
                  ) : (
                    <p className="card-desc mt-2 flex items-center gap-1.5">
                      <Icon name="bolt" size={12} />
                      {t(locale, "home.deliveryPack")}
                    </p>
                  )}
                </div>
                <div className="border-t border-line p-3">
                  {available ? (
                    <Link className="btn btn-primary cta-sheen w-full" href={topupPath(product.name, selectedMethod)}>
                      {t(locale, "home.cta.topup")}
                    </Link>
                  ) : (
                    <button type="button" disabled className="btn btn-primary w-full opacity-45">
                      {t(locale, "home.unavailable")}
                    </button>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="section animate-fade-up [animation-delay:550ms]">
        <Link className="btn btn-ghost btn-block group" href="/products">
          {t(locale, "home.viewAll")}
          <span className="inline-flex transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1">
            <Icon name="arrow-right" size={16} />
          </span>
        </Link>
      </section>
      </div>
    </main>
  )
}
