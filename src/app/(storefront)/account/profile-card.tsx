/**
 * Server component that renders one saved player profile card. It is the single
 * home for profile roster markup and optional per-card actions.
 */
import type { ReactNode } from "react"
import type { ProfileDto } from "@/api/contracts"
import { Icon } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export function ProfileCard({
  profile,
  locale,
  actions,
}: {
  profile: ProfileDto
  locale: Locale
  actions?: ReactNode
}) {
  const fallbackLabel = `${profile.game.toUpperCase()} · ${profile.userId}/${profile.serverId}`
  const displayName = profile.playerName ?? fallbackLabel
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"

  return (
    <article className="player-card card-lift">
      <div className="flex items-start gap-4">
        <span className="player-monogram" aria-hidden="true">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="card-kicker">{profile.game === "mlbb" ? "MLBB" : profile.game.toUpperCase()}</p>
          <h3 className="player-name truncate">{displayName}</h3>
          {profile.playerName !== null ? (
            <p className="card-desc truncate">{fallbackLabel}</p>
          ) : null}
          <div className="player-meta mt-2">
            <span className="hud-chip">
              <Icon name="user" size={12} />
              <span className="num">{profile.userId}</span>
            </span>
            <span className="hud-chip">
              <Icon name="globe" size={12} />
              <span className="num">{profile.serverId}</span>
            </span>
            {profile.playerName !== null ? (
              <span className="hud-chip border-jade/30 bg-jade/10 text-jade">
                <Icon name="check-circle" size={12} />
                {t(locale, "order.verifiedPlayer")}
              </span>
            ) : null}
            {profile.preferred ? (
              <span className="hud-chip border-gold/30 bg-gold/10 text-gold">
                <Icon name="star" size={12} />
                {t(locale, "account.defaultPlayer")}
              </span>
            ) : null}
          </div>
          {profile.createdAt !== null ? (
            <p className="card-desc mt-2">
              {t(locale, "account.addedOn", { date: profile.createdAt.slice(0, 10) })}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">{actions}</div>
      ) : null}
    </article>
  )
}
