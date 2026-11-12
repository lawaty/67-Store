"use client"
/**
 * Client form fields for selecting or entering an MLBB player profile to post with checkout.
 */
import { useState } from "react"
import { Icon } from "@/app/icons"
import { PlayerIdentityFields } from "../player-identity-fields"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

type Profile = {
  readonly id: string
  readonly game: string
  readonly userId: string
  readonly serverId: string
  readonly playerName?: string | null
}

function profileLabel(profile: Profile): string {
  return profile.playerName ?? `${profile.game.toUpperCase()} · ${profile.userId}/${profile.serverId}`
}

export function ProfileFields({
  locale,
  profiles,
  defaultUserId = "",
  defaultServerId = "",
}: {
  locale: Locale
  profiles: readonly Profile[]
  defaultUserId?: string
  defaultServerId?: string
}) {
  const [selected, setSelected] = useState(profiles[0]?.id ?? "")
  const [isNew, setIsNew] = useState(selected === "")
  const current = profiles.find((profile) => profile.id === selected)
  const name = current ? profileLabel(current) : ""
  const monogram = name.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="stack">
      {profiles.length > 0 ? (
        <div className="field">
          <label htmlFor="profileId">{t(locale, "topup.profileLabel")}</label>
          <select
            id="profileId"
            name="profileId"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value)
              setIsNew(event.target.value === "")
            }}
          >
            <option value="">{t(locale, "topup.profileNew")}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileLabel(profile)} — {profile.userId} / {profile.serverId}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {current ? (
        <div className="player-card">
          <div className="flex items-center gap-3">
            <span className="player-monogram">{monogram}</span>
            <div className="min-w-0 flex-1">
              <p className="player-name truncate">{name}</p>
              <div className="player-meta mt-1.5">
                <span className="hud-chip"><Icon name="user" size={11} /><span className="num">{current.userId}</span></span>
                <span className="hud-chip"><Icon name="grid" size={11} /><span className="num">{current.serverId}</span></span>
              </div>
            </div>
            {current.playerName ? (
              <span className="hud-chip border-jade/30 bg-jade/10 text-jade">
                <Icon name="check-circle" size={12} />
                {t(locale, "topup.verified")}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{t(locale, "topup.reviewNote")}</p>
        </div>
      ) : null}

      {isNew ? (
        <div className="grid gap-4">
          <PlayerIdentityFields
            locale={locale}
            variant="topup"
            defaultUserId={defaultUserId}
            defaultServerId={defaultServerId}
          />
          <p className="hint"><Icon name="shield" size={14} /> {t(locale, "topup.reviewNote")}</p>
        </div>
      ) : null}
    </div>
  )
}
