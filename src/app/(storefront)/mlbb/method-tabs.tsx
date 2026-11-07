/**
 * Payment-method tabs on the topup page.
 */
import Link from "next/link"
import { Icon, type IconName } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { topupPath, type UrlMethod } from "@/app/urls"

const METHODS: ReadonlyArray<{ readonly slug: UrlMethod; readonly icon: IconName; readonly labelKey: "topup.methodInstapay" | "topup.methodCrypto" | "topup.methodCoins" }> = [
  { slug: "instapay", icon: "card", labelKey: "topup.methodInstapay" },
  { slug: "crypto", icon: "crypto", labelKey: "topup.methodCrypto" },
  { slug: "coins", icon: "coins", labelKey: "topup.methodCoins" },
]

export function MethodTabs({ locale, productName, method }: { locale: Locale; productName: string; method: UrlMethod }) {
  return (
    <nav className="method-tabs mt-3" aria-label={t(locale, "topup.methodAria")}>
      {METHODS.map((item) => (
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
