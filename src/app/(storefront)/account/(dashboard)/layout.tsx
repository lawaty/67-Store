/**
 * Shared account dashboard shell: persistent sidebar navigator (wallet, orders,
 * profiles, levels, sign-out) around the /account and /account/profiles routes.
 */
import { Suspense } from "react"
import type { ReactNode } from "react"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { signOut } from "../actions"
import { AccountNav } from "./account-nav"
import { getAccount } from "@/frontend/account"
import { AccountSummary } from "./account-summary"
import { BadgeWall } from "./badge-wall"
import { AccountIdentity } from "./account-identity"

export default async function AccountDashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const account = await getAccount()

  return (
    <main className="page account-page">
      <div className="account-shell">
        <aside className="account-sidebar">
          <Suspense fallback={null}>
            <AccountNav locale={locale} />
          </Suspense>
          <form action={signOut} className="account-signout">
            <SubmitButton className="btn btn-ghost btn-sm btn-block">
              <Icon name="logout" size={15} /> {t(locale, "account.signOut")}
            </SubmitButton>
          </form>
        </aside>
        <div className="account-content">
          <div className="account-body">
            <div className="account-main">{children}</div>
            {account ? (
              <aside className="account-rail" aria-label={t(locale, "account.overview")}>
                <AccountIdentity identity={account.identity} locale={locale} compact />
                <AccountSummary account={account} locale={locale} />
                <BadgeWall achievements={account.achievements} locale={locale} />
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
