/**
 * Payment-method tabs on the topup page.
 */
import Link from "next/link"
import { Icon, type IconName } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { topupPath, type UrlMethod } from "@/app/urls"

const METHODS: ReadonlyArray<{ readonly slug: UrlMethod; readonly icon: IconName; readonly labelKey: "topup.methodInstapay" | "topup.methodCrypto" | "topup.methodCoins" }> = [
  { slug: "paymob", icon: "card", labelKey: "topup.methodInstapay" },
  { slug: "crypto", icon: "crypto", labelKey: "topup.methodCrypto" },
  { slug: "coins", icon: "coins", labelKey: "topup.methodCoins" },
]

export type MethodTabsGateways = {
  readonly card?: boolean
  readonly wallet?: boolean
  readonly crypto?: boolean
  readonly coins?: boolean
}

export function MethodTabs({
  locale,
  productName,
  method,
  gateways,
}: {
  locale: Locale
  productName: string
  method: UrlMethod
  gateways?: MethodTabsGateways
}) {
  const paymobEnabled = gateways === undefined ? true : gateways.card === true || gateways.wallet === true
  const coinsEnabled = gateways === undefined ? true : gateways.coins === true
  const cryptoEnabled = gateways === undefined ? false : gateways.crypto === true
  const offered = METHODS.filter((item) => {
    if (item.slug === "paymob") return paymobEnabled
    if (item.slug === "coins") return coinsEnabled
    return cryptoEnabled
  })

  return (
    <nav className="method-tabs mt-3" aria-label={t(locale, "topup.methodAria")}>
      {offered.map((item) => (
        <Link
          key={item.slug}
          href={topupPath(productName, item.slug)}
          className={item.slug === method ? "method-tab is-active" : "method-tab"}
          aria-current={item.slug === method ? "page" : undefined}
        >
          <Icon name={item.icon} size={16} />
          {t(locale, item.labelKey)}
        </Link>
      ))}
    </nav>
  )
}
