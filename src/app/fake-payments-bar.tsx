/**
 * Renders the site-wide warning strip shown while fake payments are enabled.
 */
import type { Locale } from "@/i18n/locale"
import { t } from "@/i18n/dictionary"

export function FakePaymentsBar({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  if (!enabled) return null
  return (
    <div className="fake-payments-bar" role="status">
      <strong className="truncate">{t(locale, "warning.fakePaymentsEnabled")}</strong>
      <span className="hidden shrink-0 sm:inline">— {t(locale, "warning.fakePaymentsFulfil")}</span>
    </div>
  )
}
