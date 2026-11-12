/**
 * Presentational panel for the account levels tab: current level, progress to next, and achievements wall.
 */
import type { AccountAchievementDto, AccountLevelsDto } from "@/api/contracts/account"
import { Coin } from "@/app/coin"
import { Icon, type IconName } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { AchievementGrid } from "./achievement-grid"

const colorClasses: Record<string, string> = {
  sky: "border-sky/40 bg-sky/10 text-sky-strong dark:text-sky",
  jade: "border-jade/40 bg-jade/10 text-jade",
  gold: "border-gold/40 bg-gold/15 text-gold",
  ember: "border-ember/40 bg-ember/10 text-ember",
}

const fallbackColor = "border-line bg-raised text-muted"

function formatPercent(basisPoints: number): string {
  const percent = basisPoints / 100
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2).replace(/\.?0+$/, "")}%`
}

export function LevelsPanel({
  levels,
  achievements,
  locale,
}: {
  readonly levels: AccountLevelsDto
  readonly achievements: readonly AccountAchievementDto[]
  readonly locale: Locale
}) {
  const clampedPercent = Math.min(100, Math.max(0, levels.percent))
  const currentColor = colorClasses[levels.current.color] ?? fallbackColor

  return (
    <div className="mt-6 space-y-6">
      <div className="card">
        <p className="card-kicker">{t(locale, "account.currentLevel")}</p>
        <p className="card-amount card-amount-text mt-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${currentColor}`}>
            <Icon name={levels.current.icon as IconName} size={16} />
            {levels.current.title}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="hud-chip flex items-center gap-1.5">
            <span className="text-muted">{t(locale, "account.qualifyingVolume")}</span>
            <span className="num flex items-center gap-1 font-bold text-ink" dir="ltr">
              {levels.volume30d}
              <Coin size={16} />
            </span>
          </span>
          <span className="hud-chip flex items-center gap-1.5">
            <span className="text-muted">{t(locale, "account.effectiveMargin")}</span>
            <span className="num font-bold text-ink" dir="ltr">
              {formatPercent(levels.effectiveMarginBasisPoints)}
            </span>
          </span>
        </div>
        <div className="mt-2 border-t border-line pt-4">
          {levels.next !== null ? (
            <>
              <p className="text-sm text-muted">
                {t(locale, "account.levelProgress", { remaining: levels.toNext, title: levels.next.title })}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-raised"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={clampedPercent}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-ember to-gold" style={{ width: `${clampedPercent}%` }} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{t(locale, "account.topLevel")}</p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-raised"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={100}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-ember to-gold" style={{ width: "100%" }} />
              </div>
            </>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h3 className="text-base font-bold text-ink">{t(locale, "account.achievements")}</h3>
        <AchievementGrid achievements={achievements} locale={locale} />
      </section>
    </div>
  )
}
