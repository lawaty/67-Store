/**
 * Full catalogue route (`/products`): diamonds and packs/bundles with all payment
 * methods, plus trust/steps and features sections.
 */
import Link from "next/link"
import { serverApi } from "@/frontend/server"
import type { StorefrontDto, StorefrontProductDto } from "@/api/contracts"
import { Icon, type IconName } from "@/app/icons"
import { topupPath } from "@/app/urls"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { ProductMethods, type ProductMethodOption } from "../product-methods"
import { partitionProducts, egpPerDiamondMinor, bestValueDiamond, methodAvailable, priceFor } from "../catalogue"
import { readPreferredMethod } from "../preferred-method"

export const dynamic = "force-dynamic"

type Product = StorefrontProductDto

export default async function Page() {
  const locale = await getLocale()
  const { products, defaultMethod, gateways, signedIn } = await (await serverApi()).get<StorefrontDto>("/api/storefront")
  const { diamonds, bundles } = partitionProducts(products)
  const preferred = await readPreferredMethod()
  const method = preferred ?? defaultMethod
  const best = bestValueDiamond(diamonds)
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

  const card = (product: Product) => {
    const isDiamond = product.isDiamond
    const unitMinor = egpPerDiamondMinor(product)
    const unit = unitMinor !== null ? unitMinor / 100 : null
    const isBest = best?.id === product.id
    const directPayAvailable = product.buyable && product.directPayAvailable
    const coinsAvailable = methodAvailable(product, "coins", signedIn)
    const anyAvailable =
      (paymobEnabled && methodAvailable(product, "paymob", signedIn)) ||
      (coinsEnabled && coinsAvailable) ||
      (cryptoEnabled && methodAvailable(product, "crypto", signedIn))
    const unavailableText = !directPayAvailable
      ? product.unavailableReason === "insufficient_funds" && product.fundingGapMinor > 0
        ? t(locale, "home.fundingGap", { amount: (product.fundingGapMinor / 100).toFixed(2) })
        : t(locale, "home.unavailableUnknown")
      : undefined
    const coinsText = !coinsAvailable
      ? product.coinsGap > 0
        ? t(locale, "topup.coinsGap", { amount: String(product.coinsGap) })
        : t(locale, "home.unavailableUnknown")
      : undefined
    const egp = priceFor(product, "paymob", currency)
    const coins = priceFor(product, "coins", currency)
    const crypto = priceFor(product, "crypto", currency)
    const methods: ProductMethodOption[] = []
    if (paymobEnabled) {
      methods.push({
        id: "paymob",
        label: t(locale, "home.methodInstapay"),
        href: topupPath(product.name, "paymob"),
        price: egp.price,
        disabled: !directPayAvailable,
        reason: unavailableText,
        fundingGapMinor: directPayAvailable ? undefined : product.fundingGapMinor,
      })
    }
    if (coinsEnabled) {
      methods.push({
        id: "coins",
        label: t(locale, "home.methodCoins"),
        href: topupPath(product.name, "coins"),
        price: coins.price,
        coinAmount: coins.coinAmount,
        disabled: !coinsAvailable,
        reason: coinsText,
      })
    }
    if (cryptoEnabled) {
      methods.push({
        id: "crypto",
        label: t(locale, "home.methodCrypto"),
        href: topupPath(product.name, "crypto"),
        price: crypto.price,
        disabled: !directPayAvailable,
        reason: unavailableText,
        fundingGapMinor: directPayAvailable ? undefined : product.fundingGapMinor,
      })
    }

    return (
      <li className={`card relative overflow-hidden ${isBest ? "border-ember/40" : ""}`} key={product.id}>
        {isBest ? <span aria-hidden className="ember-seam absolute inset-y-0 start-0 w-1" /> : null}
        <div className="card-body">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="card-kicker">{isDiamond ? t(locale, "home.diamonds") : t(locale, "home.packs")}</p>
              <p className={`card-amount mt-2 flex items-baseline gap-1.5 ${isDiamond ? "" : "card-amount-text"}`}>
                {product.name}
                {isDiamond ? <span className="text-ember"><Icon name="gem" size={18} /></span> : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {isBest ? <span className="badge badge-paid">{t(locale, "home.bestValue")}</span> : null}
              {!anyAvailable ? <span className="badge">{t(locale, "home.unavailable")}</span> : null}
            </div>
          </div>
          {unit !== null ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <span className="num">{unit.toFixed(2)} {currency}</span>
              <span>/ {t(locale, "home.perDiamond")}</span>
            </p>
          ) : null}
          <p className="card-desc mt-2">{isDiamond ? t(locale, "home.deliveryDiamond") : t(locale, "home.deliveryPack")}</p>
        </div>
          <ProductMethods options={methods} defaultId={selectedMethod} label={t(locale, "home.paymentMethod")} ctaLabel={t(locale, "home.continue")} />
      </li>
    )
  }

  const steps: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: "gift", title: t(locale, "home.steps.1.title"), body: t(locale, "home.steps.1.body") },
    { icon: "user", title: t(locale, "home.steps.2.title"), body: t(locale, "home.steps.2.body") },
    { icon: "bolt", title: t(locale, "home.steps.3.title"), body: t(locale, "home.steps.3.body") },
  ]

  const features: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: "bolt", title: t(locale, "home.feature.instant.title"), body: t(locale, "home.feature.instant.body") },
    { icon: "shield", title: t(locale, "home.feature.secure.title"), body: t(locale, "home.feature.secure.body") },
    { icon: "chat", title: t(locale, "home.feature.support.title"), body: t(locale, "home.feature.support.body") },
  ]

  return (
    <main className="page">
      <section className="section">
        <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink" href="/">
          <span className="inline-flex rotate-180"><Icon name="arrow-right" size={14} /></span>
          {t(locale, "home.backHome")}
        </Link>
        <p className="eyebrow mt-4"><span className="hud-dot" />{t(locale, "home.eyebrow")}</p>
        <h1 className="display-1 mt-3">{t(locale, "home.catalogueTitle")}</h1>
        <p className="lede mt-3">{t(locale, "home.catalogueLede")}</p>
      </section>

      {products.length === 0 ? (
        <p className="empty mt-10">{t(locale, "home.empty")}</p>
      ) : (
        <>
          {diamonds.length > 0 ? (
            <section className="section">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow"><Icon name="gem" size={12} />{t(locale, "home.diamonds")}</p>
                  <h2 className="display-2 mt-2">{t(locale, "home.diamonds")}</h2>
                </div>
                <span className="hud-chip"><Icon name="gem" size={12} />{diamonds.length}</span>
              </div>
              <ul className="product-grid mt-6 max-h-[min(40rem,65vh)] overflow-y-auto overscroll-contain pretty-scrollbar">{diamonds.map(card)}</ul>
            </section>
          ) : null}

          {bundles.length > 0 ? (
            <section className="section">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow"><Icon name="tag" size={12} />{t(locale, "home.packs")}</p>
                  <h2 className="display-2 mt-2">{t(locale, "home.packs")}</h2>
                </div>
                <span className="hud-chip"><Icon name="tag" size={12} />{bundles.length}</span>
              </div>
              <ul className="product-grid mt-6 max-h-[min(40rem,65vh)] overflow-y-auto overscroll-contain pretty-scrollbar">{bundles.map(card)}</ul>
            </section>
          ) : null}
        </>
      )}

      <section className="section">
        <p className="eyebrow">{t(locale, "home.trust")}</p>
        <h2 className="display-2 mt-2">{t(locale, "home.steps.title")}</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-e1">
              <span aria-hidden className="absolute end-4 top-3 font-mono text-4xl font-bold text-line">0{index + 1}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-ember/30 bg-ember/10 text-ember">
                <Icon name={step.icon} size={18} />
              </span>
              <h3 className="mt-4">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="grid gap-3 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-raised text-ember">
                <Icon name={feature.icon} size={18} />
              </span>
              <h3 className="mt-4">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
