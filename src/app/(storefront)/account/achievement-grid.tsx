import type { AccountAchievementDto } from "@/api/contracts/account"
import { Icon, type IconName } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

const colorClasses: Record<string, string> = {
  sky: "border-sky/40 bg-sky/10 text-sky-strong dark:text-sky",
  jade: "border-jade/40 bg-jade/10 text-jade",
  gold: "border-gold/40 bg-gold/15 text-gold",
  ember: "border-ember/40 bg-ember/10 text-ember",
}

const fallbackColor = "border-line bg-raised text-muted"

export function AchievementGrid({
  achievements,
  locale,
}: {
  readonly achievements: readonly AccountAchievementDto[]
  readonly locale: Locale
}) {
  return (
    <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
      {achievements.map((achievement) => {
        const color = colorClasses[achievement.color] ?? fallbackColor
        const description =
          achievement.source === "level"
            ? t(locale, "account.levelThreshold", { coins: achievement.target })
            : achievement.description
        const showProgress = achievement.source === "managed"

        return (
          <li key={achievement.key} className="group relative">
            <div
              tabIndex={0}
              className={`relative flex aspect-square w-full items-center justify-center rounded-xl border outline-none ring-ember/40 focus-visible:ring-2 ${
                achievement.earned ? color : "border-line bg-raised text-muted opacity-60"
              }`}
              aria-label={achievement.title}
            >
              <Icon name={achievement.icon as IconName} size={22} />
              <span
                className={`absolute -top-1 -end-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-line bg-surface px-1 text-[10px] font-bold leading-none ${
                  achievement.earned ? "text-ink" : "text-muted"
                }`}
              >
                {achievement.count}
              </span>
            </div>

            <div className="pointer-events-none absolute start-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 opacity-0 shadow-e2 transition group-focus-within:opacity-100 group-hover:opacity-100 rtl:translate-x-1/2">
              <p className="font-bold text-ink">{achievement.title}</p>
              <p className="mt-1 text-sm text-muted">{description}</p>
              {showProgress ? (
                <p className="mt-2 text-xs font-semibold text-ink">
                  {achievement.count} / {achievement.target}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
