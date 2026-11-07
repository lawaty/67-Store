/**
 * Site footer for the storefront layout, rendering brand, navigation, and payment method links.
 */
import Link from "next/link"
import { Icon } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Link className="brand" href="/">
            <img src="/logo-64.png" srcSet="/logo-64.png 1x, /logo-128.png 2x" alt="" width={47} height={32} decoding="async" />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t(locale, "footer.tagline")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="hud-chip"><span className="hud-dot" />{t(locale, "footer.delivery")}</span>
            <span className="hud-chip"><Icon name="shield" size={12} />{t(locale, "footer.secure")}</span>
          </div>
        </div>
        <div>
          <h3 className="footer-title">{t(locale, "footer.shop")}</h3>
          <Link className="footer-link" href="/">{t(locale, "home.title")}</Link>
          <Link className="footer-link" href="/products">{t(locale, "home.catalogueTitle")}</Link>
        </div>
        <div>
          <h3 className="footer-title">{t(locale, "footer.account")}</h3>
          <Link className="footer-link" href="/account">{t(locale, "nav.myAccount")}</Link>
          <Link className="footer-link" href="/account/profiles">{t(locale, "account.playerProfiles")}</Link>
          <Link className="footer-link" href="/account/login">{t(locale, "account.loginTitle")}</Link>
        </div>
        <div>
          <h3 className="footer-title">{t(locale, "footer.payments")}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="hud-chip"><Icon name="card" size={12} />{t(locale, "home.methodInstapay")}</span>
            <span className="hud-chip"><Icon name="crypto" size={12} />{t(locale, "home.methodCrypto")}</span>
            <span className="hud-chip"><Icon name="coins" size={12} />{t(locale, "home.methodCoins")}</span>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Icon name="lock" size={14} />{t(locale, "footer.secure")}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="shell flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t(locale, "footer.rights")}</p>
          <p className="num text-muted">67.store</p>
        </div>
      </div>
    </footer>
  )
}
