"use client"
/**
 * Player id + zone/server inputs that verify the player as the visitor types,
 * before any form is submitted. Shared by the checkout and account profile forms.
 */
import { useEffect, useRef, useState } from "react"
import { Icon } from "@/app/icons"
import { Spinner } from "@/app/skeleton"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { usePlayerCheck } from "./player-check"

export function PlayerIdentityFields({
  locale,
  variant,
  defaultUserId = "",
  defaultServerId = "",
}: {
  locale: Locale
  variant: "topup" | "account"
  defaultUserId?: string
  defaultServerId?: string
}) {
  const [userId, setUserId] = useState(defaultUserId)
  const [serverId, setServerId] = useState(defaultServerId)
  const check = usePlayerCheck("mlbb", userId, serverId)
  const idInput = useRef<HTMLInputElement>(null)

  const userIdLabel = variant === "topup" ? t(locale, "topup.playerIdLabel") : t(locale, "account.playerId")
  const userIdHint = variant === "topup" ? t(locale, "topup.playerIdHint") : t(locale, "account.playerIdHint")
  const userIdPlaceholder = variant === "topup" ? t(locale, "topup.playerIdPlaceholder") : undefined
  const serverIdLabel = variant === "topup" ? t(locale, "topup.zoneLabel") : t(locale, "account.playerRegion")
  const serverIdHint = variant === "topup" ? t(locale, "topup.zoneHint") : t(locale, "account.playerRegionHint")
  const serverIdPlaceholder = variant === "topup" ? t(locale, "topup.zonePlaceholder") : undefined

  useEffect(() => {
    const input = idInput.current
    if (input === null) return
    input.setCustomValidity(
      check.status === "checking"
        ? t(locale, "common.playerChecking")
        : check.status === "invalid"
          ? t(locale, "account.profileInvalidPlayer")
          : check.status === "unverified"
            ? t(locale, "account.profileVerifyFailed")
            : "",
    )
  }, [check.status, locale])

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="userId">{userIdLabel}</label>
          <input
            id="userId"
            name="userId"
            ref={idInput}
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder={userIdPlaceholder}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            aria-invalid={check.status === "invalid" || undefined}
            aria-describedby="player-check-status"
          />
          <p className="hint"><Icon name="user" size={14} /> {userIdHint}</p>
        </div>
        <div className="field">
          <label htmlFor="serverId">{serverIdLabel}</label>
          <input
            id="serverId"
            name="serverId"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder={serverIdPlaceholder}
            value={serverId}
            onChange={(event) => setServerId(event.target.value)}
            aria-describedby="player-check-status"
          />
          <p className="hint"><Icon name="grid" size={14} /> {serverIdHint}</p>
        </div>
      </div>
      {check.status !== "idle" ? (
        <p
          id="player-check-status"
          role="status"
          aria-live="polite"
          className={
            "flex items-center gap-1.5 text-xs font-semibold " +
            (check.status === "valid" ? "text-jade" : check.status === "checking" ? "text-muted" : "text-danger")
          }
        >
          {check.status === "checking" ? (
            <><Spinner className="h-3.5 w-3.5" /> {t(locale, "common.playerChecking")}</>
          ) : check.status === "valid" ? (
            <><Icon name="check-circle" size={14} /> {t(locale, "topup.verified")}{check.name ? ` · ${check.name}` : ""}</>
          ) : check.status === "invalid" ? (
            <><Icon name="alert" size={14} /> {t(locale, "account.profileInvalidPlayer")}</>
          ) : (
            <><Icon name="alert" size={14} /> {t(locale, "account.profileVerifyFailed")}</>
          )}
        </p>
      ) : null}
    </div>
  )
}
