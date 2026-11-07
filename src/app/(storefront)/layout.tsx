/**
 * Storefront layout shell: wraps storefront routes with the review bar, header, footer, and chat widget.
 * Provides the shared chrome around page content for the public storefront.
 */
import type { ReactNode } from "react"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { ChatWidget } from "@/app/chat-widget"
import { NavigationProgress } from "@/app/navigation-progress"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"
import { serverApi } from "@/frontend/server"
import { readPreferredMethod } from "./preferred-method"
import type { UrlMethod } from "@/app/urls"

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const preferred = await readPreferredMethod()
  const method: UrlMethod =
    preferred ?? (await (await serverApi()).get<{ readonly method: UrlMethod }>("/api/storefront/method")).method
  return (
    <>
      <NavigationProgress />
      <div className="review-bar">
        <strong>{t(locale, "review.underReview")}</strong>
        <span className="en">{t(locale, "review.everythingUnderReview")}</span>
      </div>
      <div className="site-chrome">
        <SiteHeader locale={locale} method={method} />
      </div>
      {children}
      <SiteFooter locale={locale} />
      <ChatWidget locale={locale} />
    </>
  )
}
