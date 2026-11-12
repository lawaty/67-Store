/**
 * Account overview route at /account: compact section header plus the wallet,
 * orders, profiles, and levels sections chosen by ?tab=, with a summary rail.
 * Returns not found when the account session is unavailable.
 */
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAccount } from "@/frontend/account"
import { displayCurrency } from "@/frontend/format"
import { statusClass, statusLabel } from "@/app/status-label"
import { Icon } from "@/app/icons"
import { Coin } from "@/app/coin"
import { Toast } from "@/app/toast"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { LevelsPanel } from "../levels-panel"
import { ProfileCard } from "../profile-card"
import { AccountIdentity } from "./account-identity"
import { FundWalletDialog } from "./fund-wallet-dialog"

export const dynamic = "force-dynamic"

type Tab = "wallet" | "orders" | "profiles" | "levels"

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; funded?: string }>
}) {
  const params = await searchParams
  const locale = await getLocale()
  const account = await getAccount()
  if (account === null) {
    notFound()
  }

  const tab: Tab =
    params.tab === "wallet" || params.tab === "orders" || params.tab === "profiles" || params.tab === "levels"
      ? params.tab
      : "profiles"

  const sectionTitle = {
    wallet: t(locale, "account.walletTitle"),
    orders: t(locale, "account.orders"),
    profiles: t(locale, "account.playerProfiles"),
    levels: t(locale, "account.levelsTitle"),
  }[tab]
  const sectionLede = {
    wallet: t(locale, "account.walletLede"),
    orders: t(locale, "account.ordersLede"),
    profiles: t(locale, "account.profilesLede"),
    levels: t(locale, "account.levelsLede"),
  }[tab]

  return (
    <>
      {params.funded === "1" ? <Toast message={t(locale, "account.funded")} locale={locale} /> : null}

      <header className="account-header">
        <div className="min-w-0 space-y-3">
          <AccountIdentity identity={account.identity} locale={locale} />
          <div>
            <p className="eyebrow">
              <Icon name="user" size={12} />
              {t(locale, "account.title")}
            </p>
            <h1 className="account-title mt-2">{sectionTitle}</h1>
            <p className="lede mt-1.5 text-sm">{sectionLede}</p>
          </div>
        </div>
        {tab === "wallet" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="coin-chip">
              <Icon name="coins" size={16} />
              <span className="num">{account.wallet.coinBalance}</span>
              <Coin size={18} />
            </span>
            {account.fundingAvailable ? (
              <FundWalletDialog locale={locale} className="btn btn-primary btn-sm" />
            ) : null}
          </div>
        ) : null}
        {tab === "orders" ? (
          <span className="hud-chip">
            <Icon name="receipt" size={12} />
            {account.orders.length}
          </span>
        ) : null}
        {tab === "profiles" ? (
          <Link className="btn btn-primary btn-sm" href="/account/profiles">
            <Icon name="plus" size={15} /> {t(locale, "account.manageProfiles")}
          </Link>
        ) : null}
      </header>

      {tab === "wallet" ? (
            account.entries.length === 0 ? (
              <p className="empty">{t(locale, "account.noMoves")}</p>
            ) : (
              <>
                <div className="table-desktop overflow-x-auto rounded-2xl border border-line">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t(locale, "account.move")}</th>
                        <th>{t(locale, "account.reason")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span
                              className={entry.amount > 0 ? "num font-bold text-jade" : "num font-bold text-danger"}
                              dir="ltr"
                            >
                              {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                            </span>
                          </td>
                          <td>
                            <p className="font-semibold text-ink">{entry.reason}</p>
                            <p className="num mt-0.5 text-[11px] text-muted">{entry.createdAt.slice(0, 10)}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards">
                  {account.entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={entry.amount > 0 ? "num text-sm font-bold text-jade" : "num text-sm font-bold text-danger"}
                          dir="ltr"
                        >
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </span>
                        <span className="num text-[11px] text-muted">{entry.createdAt.slice(0, 10)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{entry.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}

          {tab === "orders" ? (
            account.orders.length === 0 ? (
              <p className="empty">{t(locale, "account.noOrders")}</p>
            ) : (
              <>
                <div className="table-desktop overflow-x-auto rounded-2xl border border-line">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t(locale, "account.order")}</th>
                        <th>{t(locale, "account.status")}</th>
                        <th>{t(locale, "account.product")}</th>
                        <th>{t(locale, "account.orderPlayer")}</th>
                        <th>{t(locale, "account.price")}</th>
                        <th>{t(locale, "account.orderDate")}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {account.orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link className="num text-xs font-bold text-ember hover:underline" href={`/order/${order.token}`}>
                              {order.token.slice(0, 8).toUpperCase()}
                            </Link>
                          </td>
                          <td>
                            <span className={statusClass(order.status)}>{statusLabel(order.status, locale)}</span>
                          </td>
                          <td className="font-semibold">{order.productName}</td>
                          <td>{order.playerName ?? `${order.userId} · ${order.serverId}`}</td>
                          <td>
                            <span className="amount" dir="ltr">{`${(order.price.minor / 100).toFixed(2)} ${displayCurrency(order.price.currency)}`}</span>
                          </td>
                          <td>
                            {order.createdAt ? (
                              <span className="num" dir="ltr">
                                {order.createdAt.slice(0, 10)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <Link className="btn btn-ghost btn-sm" href={`/order/${order.token}`}>
                              {t(locale, "account.order")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards">
                  {account.orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/order/${order.token}`}
                      className="rounded-2xl border border-line bg-surface p-4 shadow-e1 transition hover:border-ember/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="num text-xs font-bold text-ember">#{order.token.slice(0, 8).toUpperCase()}</span>
                        <span className={statusClass(order.status)}>{statusLabel(order.status, locale)}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-ink">{order.productName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <Icon name="user" size={13} />
                        <span>{order.playerName ?? `${order.userId} · ${order.serverId}`}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-muted">
                          <span className="num" dir="ltr">{`${(order.price.minor / 100).toFixed(2)} ${displayCurrency(order.price.currency)}`}</span>
                          {order.createdAt ? (
                            <span className="num" dir="ltr">
                              {order.createdAt.slice(0, 10)}
                            </span>
                          ) : null}
                        </span>
                        <span className="rtl:-scale-x-100">
                          <Icon name="chevron-right" size={15} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )
          ) : null}

          {tab === "profiles" ? (
            account.profiles.length === 0 ? (
              <p className="empty">{t(locale, "account.noProfiles")}</p>
            ) : (
              <div className="stagger grid gap-4 sm:grid-cols-2">
                {account.profiles.map((profile) => (
                  <ProfileCard key={profile.id} profile={profile} locale={locale} />
                ))}
              </div>
            )
          ) : null}

          {tab === "levels" ? <LevelsPanel levels={account.levels} achievements={account.achievements} locale={locale} /> : null}
    </>
  )
}
