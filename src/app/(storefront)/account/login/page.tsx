/**
 * Login route at /account/login: renders the sign-in form and shows credential errors.
 * Submits to the account sign-in server action.
 */
import Link from "next/link"
import { signIn } from "../actions"
import { Icon } from "@/app/icons"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { SubmitButton } from "@/app/submit-button"
import { brand } from "@/shared/brand"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const locale = await getLocale()
  const { error } = await searchParams

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

            <p className="eyebrow mt-6"><Icon name="user" size={12} />{t(locale, "account.loginTitle")}</p>
            <h1 className="display-2 mt-3">{t(locale, "account.loginTitle")}</h1>

            {error ? <div className="alert mt-4">{t(locale, "account.invalidCredentials")}</div> : null}

            <form action={signIn} className="mt-6 stack">
              <div className="field">
                <label htmlFor="email">{t(locale, "account.email")}</label>
                <input id="email" type="email" name="email" required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="password">{t(locale, "account.password")}</label>
                <input id="password" type="password" name="password" required autoComplete="current-password" />
              </div>
              <SubmitButton className="btn btn-primary btn-block min-h-12">
                <Icon name="send" size={15} /> {t(locale, "account.login")}
              </SubmitButton>
            </form>

            <p className="auth-alt mt-6">
              <Link href="/account/register">{t(locale, "account.noAccount")}</Link>
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="lock" size={13} /> {t(locale, "topup.secureNote")}
        </p>
      </div>
    </main>
  )
}
