import Link from "next/link"
import type { AccountDto } from "@/api/contracts/account"
import { Icon } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"
import { ProfileCard } from "../profile-card"
import { FundWalletDialog } from "./fund-wallet-dialog"

export function AccountSummary({
  account,
  locale,
}: {
  readonly account: AccountDto
  readonly locale: Locale
}) {
  const preferredProfile = account.profiles.find((profile) => profile.preferred) ?? null

  return (
    <>
      <section className="card">
        <p className="card-kicker">{t(locale, "account.overview")}</p>
        <div className="flex flex-col">
          <Link href="/account?tab=wallet" className="account-stat">
            <span>{t(locale, "account.walletTitle")}</span>
            <span className="account-stat-value">{account.wallet.coinBalance}</span>
          </Link>
          <Link href="/account?tab=levels" className="account-stat">
            <span>{t(locale, "account.levelsTitle")}</span>
            <span className="account-stat-value">{account.levels.current.title}</span>
          </Link>
          <Link href="/account?tab=orders" className="account-stat">
            <span>{t(locale, "account.orders")}</span>
            <span className="account-stat-value">{account.orders.length}</span>
          </Link>
          <Link href="/account?tab=profiles" className="account-stat">
            <span>{t(locale, "account.playerProfiles")}</span>
            <span className="account-stat-value">{account.profiles.length}</span>
          </Link>
        </div>
      </section>

      <section className="card">
        <p className="card-kicker">{t(locale, "account.quickActions")}</p>
        <div className="flex flex-col gap-2">
          {account.fundingAvailable ? <FundWalletDialog locale={locale} /> : null}
          <Link className="btn btn-ghost btn-sm btn-block" href="/account/profiles">
            <Icon name="user" size={15} /> {t(locale, "account.manageProfiles")}
          </Link>
        </div>
      </section>

      {preferredProfile ? (
        <section>
          <p className="card-kicker mb-3">{t(locale, "account.defaultPlayer")}</p>
          <ProfileCard profile={preferredProfile} locale={locale} />
        </section>
      ) : null}
    </>
  )
}
