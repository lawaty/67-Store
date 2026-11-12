/**
 * Profiles route at /account/profiles: roster grid.
 * Displays success, removal, or validation feedback via toasts.
 */
import { getProfiles } from "@/frontend/account"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { Toast } from "@/app/toast"
import { ProfileCard } from "../../profile-card"
import { removeProfile, savePlayerPreference } from "./actions"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { NewProfileDialog } from "../new-profile-dialog"

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
    <>
      {query.saved === "1" ? <Toast message={t(locale, "account.profileSaved")} locale={locale} /> : null}
      {query.removed === "1" ? <Toast message={t(locale, "account.removedProfile")} tone="ok" locale={locale} /> : null}
      {query.error === "1" ? <Toast message={t(locale, "account.profileExists")} tone="bad" locale={locale} /> : null}
      {query.error === "player" ? (
        <Toast message={t(locale, "account.profileInvalidPlayer")} tone="bad" locale={locale} />
      ) : null}
      {query.error === "verify" ? (
        <Toast message={t(locale, "account.profileVerifyFailed")} tone="bad" locale={locale} />
      ) : null}

      <header className="account-header">
        <div className="min-w-0">
          <p className="eyebrow">
            <Icon name="user" size={12} />
            {t(locale, "account.yourProfiles")}
          </p>
          <h1 className="account-title mt-2">{t(locale, "account.profilesTitle")}</h1>
          <p className="lede mt-1.5 text-sm">{t(locale, "account.profilesLede")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-chip">
            <Icon name="user" size={12} />
            {profiles.length} {t(locale, "account.activeProfiles")}
          </span>
          <NewProfileDialog locale={locale} />
        </div>
      </header>

      {profiles.length === 0 ? (
        <p className="empty">{t(locale, "account.noProfiles")}</p>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2">
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
    </>
  )
}
