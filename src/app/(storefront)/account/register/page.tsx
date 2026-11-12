/**
 * Registration route at /account/register: renders the account creation form and shows registration errors.
 * Submits to the account register server action with optional next/profile query values.
 */
import Link from "next/link"
import { register } from "../actions"
import { Icon } from "@/app/icons"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { SubmitButton } from "@/app/submit-button"
import { brand } from "@/shared/brand"

export const dynamic = "force-dynamic"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; playerUserId?: string; playerServerId?: string }>
}) {
  const locale = await getLocale()
  const { error, next, playerUserId, playerServerId } = await searchParams

  return (
    <main className="page">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-e2">
          <div className="ember-seam h-1" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-ember/30 bg-ember/10 text-ember">
                <Icon name="flame" size={18} />
              </span>
              <span className="font-display text-base font-extrabold"><span className="text-ember">{brand.short}</span> {brand.suffix}</span>
            </div>

            <p className="eyebrow mt-6"><Icon name="sparkles" size={12} />{t(locale, "account.registerTitle")}</p>
            <h1 className="display-2 mt-3">{t(locale, "account.registerTitle")}</h1>

            {error ? (
              <div className="alert mt-4">
                {error === "password"
                  ? t(locale, "account.passwordTooShort")
                  : error === "invalid_username"
                    ? t(locale, "account.invalidUsername")
                    : error === "username_taken"
                      ? t(locale, "account.usernameTaken")
                      : t(locale, "account.registerFailed")}
              </div>
            ) : null}

            <form action={register} className="mt-6 stack">
              <input type="hidden" name="next" value={next ?? ""} />
              <input type="hidden" name="playerUserId" value={playerUserId ?? ""} />
              <input type="hidden" name="playerServerId" value={playerServerId ?? ""} />
              <div className="field">
                <label htmlFor="username">{t(locale, "account.username")}</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9_]+"
                  autoComplete="username"
                />
                <p className="hint"><Icon name="user" size={14} /> {t(locale, "account.usernameHint")}</p>
              </div>
              <div className="field">
                <label htmlFor="email">{t(locale, "account.email")}</label>
                <input id="email" type="email" name="email" required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="password">{t(locale, "account.password")}</label>
                <input id="password" type="password" name="password" required minLength={8} autoComplete="new-password" />
                <p className="hint"><Icon name="lock" size={14} /> {t(locale, "account.passwordTooShort")}</p>
              </div>
              <SubmitButton className="btn btn-primary btn-block min-h-12">
                <Icon name="check" size={15} /> {t(locale, "account.createAccount")}
              </SubmitButton>
            </form>

            <p className="auth-alt mt-6">
              <Link href="/account/login">{t(locale, "account.haveAccount")}</Link>
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="shield" size={13} /> {t(locale, "topup.secureNote")}
        </p>
      </div>
    </main>
  )
}
