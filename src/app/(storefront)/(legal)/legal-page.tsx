import Link from "next/link"
import { LEGAL_FACTS, POLICY_VERSION } from "@/shared/legal"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export type LegalPageSlug = "terms" | "privacy" | "refund" | "delivery" | "cookies" | "contact"

const SECTION_COUNTS: Record<LegalPageSlug, number> = {
  terms: 7,
  privacy: 8,
  refund: 6,
  delivery: 5,
  cookies: 5,
  contact: 4,
}

function sectionKeys(slug: LegalPageSlug, n: number) {
  return {
    title: `legal.${slug}.s${n}.title` as const,
    body: `legal.${slug}.s${n}.body` as const,
  }
}

export async function LegalPage({
  slug,
  locale: localeOverride,
}: {
  slug: LegalPageSlug
  locale?: Locale
}) {
  const locale = localeOverride ?? (await getLocale())
  const sectionCount = SECTION_COUNTS[slug]

  return (
    <main>
      <article className="mx-auto max-w-3xl">
        <header>
          <h1 className="display-1 mt-3">{t(locale, `legal.${slug}.title` as const)}</h1>
          <p className="lede mt-3">{t(locale, `legal.${slug}.intro` as const)}</p>
          <p className="mt-3 text-xs text-muted">
            <span>{t(locale, "legal.common.version")}: </span>
            <span className="num">{POLICY_VERSION}</span>
            <span className="mx-2">·</span>
            <span>{t(locale, "legal.common.updated")}: </span>
            <span className="num">{POLICY_VERSION}</span>
          </p>
        </header>

        <div className="mt-8 stack">
          {Array.from({ length: sectionCount }, (_, i) => i + 1).map((n) => {
            const keys = sectionKeys(slug, n)
            return (
              <section key={n} className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
                <h2 className="text-base font-bold text-ink">{t(locale, keys.title as any)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted whitespace-pre-line">
                  {t(locale, keys.body as any)}
                </p>
              </section>
            )
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-surface/60 p-5">
          <h2 className="text-base font-bold text-ink">{t(locale, "legal.common.questions")}</h2>
          <p className="mt-2 text-sm text-muted">
            <a className="link" href={`mailto:${LEGAL_FACTS.supportEmail}`}>
              {t(locale, "legal.common.emailUs")}
            </a>
          </p>
        </section>

        <div className="mt-8">
          <Link href="/" className="btn btn-ghost btn-sm">
            {t(locale, "legal.common.backToStore")}
          </Link>
        </div>
      </article>
    </main>
  )
}
