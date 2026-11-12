import type { AccountAchievementDto } from "@/api/contracts/account"
import { AchievementGrid } from "../achievement-grid"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export function BadgeWall({
  achievements,
  locale,
}: {
  readonly achievements: readonly AccountAchievementDto[]
  readonly locale: Locale
}) {
  return (
    <section className="card" data-testid="badge-wall">
      <p className="card-kicker">{t(locale, "account.achievements")}</p>
      <AchievementGrid achievements={achievements} locale={locale} />
    </section>
  )
}
