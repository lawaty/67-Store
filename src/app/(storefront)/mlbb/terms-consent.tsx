import Link from "next/link"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { LEGAL_ROUTES } from "@/shared/legal"

export function TermsConsent({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
      <div className="flex items-start gap-3">
        <input
          id="terms-accepted"
          className="check mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--ember))]"
          type="checkbox"
          name="termsAccepted"
          value="on"
          required
        />
        <label htmlFor="terms-accepted" className="text-sm leading-relaxed text-ink">
          {t(locale, "legal.consent.before")}{" "}
          <Link className="font-semibold text-ember underline decoration-ember/30 underline-offset-2 hover:decoration-ember" href={LEGAL_ROUTES.terms}>
            {t(locale, "legal.nav.terms")}
          </Link>{" "}
          {t(locale, "legal.consent.and")}{" "}
          <Link className="font-semibold text-ember underline decoration-ember/30 underline-offset-2 hover:decoration-ember" href={LEGAL_ROUTES.refund}>
            {t(locale, "legal.nav.refund")}
          </Link>
          {t(locale, "legal.consent.after")}
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">{t(locale, "legal.consent.deliveryNote")}</p>
    </div>
  )
}
