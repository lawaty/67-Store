/**
 * Profiles route at /account/profiles: lists saved player profiles and renders the add-profile form.
 * Displays success, removal, or validation feedback based on query parameters.
 */
import Link from "next/link"
import { getProfiles } from "@/frontend/account"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { PlayerIdentityFields } from "../../player-identity-fields"
import { Toast } from "@/app/toast"
import { ProfileCard } from "../profile-card"
import { addProfile, removeProfile, savePlayerPreference } from "./actions"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"

export const dynamic = "force-dynamic"

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; removed?: string }>
}) {
  const locale = await getLocale()
  const query = await searchParams
  const profiles = await getProfiles()

  return (
    <main className="page">
      {query.saved === "1" ? <Toast message={t(locale, "account.profileSaved")} locale={locale} /> : null}
      {query.removed === "1" ? <Toast message={t(locale, "account.removedProfile")} tone="ok" locale={locale} /> : null}
      {query.error === "1" ? <Toast message={t(locale, "account.profileExists")} tone="bad" locale={locale} /> : null}
      {query.error === "player" ? (
        <Toast message={t(locale, "account.profileInvalidPlayer")} tone="bad" locale={locale} />
      ) : null}
      {query.error === "verify" ? (
        <Toast message={t(locale, "account.profileVerifyFailed")} tone="bad" locale={locale} />
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="btn btn-ghost btn-sm" href="/account">
          <span className="rtl:-scale-x-100">
            <Icon name="chevron-right" size={15} />
          </span>
          {t(locale, "account.backToAccount")}
        </Link>
        <span className="hud-chip">
          <Icon name="user" size={12} />
          {profiles.length} {t(locale, "account.activeProfiles")}
        </span>
      </div>

      <header>
        <p className="eyebrow">
          <Icon name="user" size={12} />
          {t(locale, "account.yourProfiles")}
        </p>
        <h1 className="display-2 mt-3">{t(locale, "account.profilesTitle")}</h1>
        <p className="lede mt-3">{t(locale, "account.profilesLede")}</p>
      </header>

      {profiles.length === 0 ? (
        <p className="empty mt-6">{t(locale, "account.noProfiles")}</p>
      ) : (
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              locale={locale}
              actions={
                <>
                  {profile.preferred ? null : (
                    <form action={savePlayerPreference}>
                      <input type="hidden" name="userId" value={profile.userId} />
                      <input type="hidden" name="serverId" value={profile.serverId} />
                      <SubmitButton className="btn btn-ghost btn-sm">
                        <Icon name="star" size={14} /> {t(locale, "account.setDefault")}
                      </SubmitButton>
                    </form>
                  )}
                  <form action={removeProfile}>
                    <input type="hidden" name="profileId" value={profile.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" aria-label={t(locale, "account.delete")}>
                      <Icon name="trash" size={14} />
                    </SubmitButton>
                  </form>
                </>
              }
            />
          ))}
        </div>
      )}

      <details className="add-profile mt-8" open={profiles.length === 0}>
        <summary className="flex items-center gap-2">
          <Icon name="plus" size={16} /> {t(locale, "account.addNewProfile")}
        </summary>
        <form action={addProfile} className="mt-5 stack">
          <div className="field">
            <label htmlFor="label">{t(locale, "account.profileName")}</label>
            <input id="label" name="label" required placeholder={t(locale, "account.profileNamePlaceholder")} />
          </div>
          <div className="field">
            <label htmlFor="game">{t(locale, "account.gameLabel")}</label>
            <select id="game" name="game" defaultValue="mlbb">
              <option value="mlbb">{t(locale, "account.mlbb")}</option>
            </select>
          </div>
          <PlayerIdentityFields locale={locale} variant="account" />
          <SubmitButton className="btn btn-primary">
            <Icon name="save" size={15} /> {t(locale, "account.saveProfile")}
          </SubmitButton>
        </form>
      </details>
    </main>
  )
}
