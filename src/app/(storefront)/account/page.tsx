/**
 * Account overview route at /account: renders the signed-in client's wallet, orders, profiles, and levels tabs.
 * Returns not found when the account session is unavailable.
 */
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAccount } from "@/frontend/account"
import { signOut } from "./actions"
import { statusClass, statusLabel } from "@/app/status-label"
import { Icon, type IconName } from "@/app/icons"
import { Coin } from "@/app/coin"
import { SubmitButton } from "@/app/submit-button"
import { Toast } from "@/app/toast"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { LevelsPanel } from "./levels-panel"
import { ProfileCard } from "./profile-card"

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

  const currency = t(locale, "common.currency")
  const tab: Tab =
    params.tab === "orders" || params.tab === "profiles" || params.tab === "levels" ? params.tab : "wallet"
  const tabs: { key: Tab; label: string; icon: IconName }[] = [
    { key: "wallet", label: t(locale, "account.tabs.wallet"), icon: "wallet" },
    { key: "orders", label: t(locale, "account.tabs.orders"), icon: "receipt" },
    { key: "profiles", label: t(locale, "account.tabs.profiles"), icon: "user" },
    { key: "levels", label: t(locale, "account.tabs.levels"), icon: "sparkles" },
  ]

  return (
    <main className="page">
      {params.funded === "1" ? <Toast message={t(locale, "account.funded")} locale={locale} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            <Icon name="user" size={12} />
            {t(locale, "account.title")}
          </p>
          <h1 className="display-2 mt-3">{t(locale, "account.title")}</h1>
          <p className="lede mt-3">{t(locale, "account.overviewLede")}</p>
        </div>
        <form action={signOut}>
          <SubmitButton className="btn btn-ghost btn-sm">
            <Icon name="logout" size={15} /> {t(locale, "account.signOut")}
          </SubmitButton>
        </form>
      </div>

      <div className="stagger mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/account?tab=wallet" className="card card-lift">
          <p className="card-kicker">{t(locale, "account.walletTitle")}</p>
          <p className="card-amount">
            <Coin size={20} />
            <span className="num">{account.wallet.coinBalance}</span>
          </p>
          <p className="card-desc">{t(locale, "account.walletLede")}</p>
        </Link>
        <Link href="/account?tab=levels" className="card card-lift">
          <p className="card-kicker">{t(locale, "account.levelsTitle")}</p>
          <p className="card-amount card-amount-text">
            <Icon name={account.levels.current.icon as IconName} size={18} />
            {account.levels.current.title}
          </p>
          <p className="card-desc">
            {account.levels.next !== null
              ? t(locale, "account.levelProgress", {
                  remaining: account.levels.toNext,
                  title: account.levels.next.title,
                })
              : t(locale, "account.topLevel")}
          </p>
        </Link>
        <Link href="/account?tab=orders" className="card card-lift">
          <p className="card-kicker">{t(locale, "account.orders")}</p>
          <p className="card-amount num">{account.orders.length}</p>
          <p className="card-desc">{t(locale, "account.ordersLede")}</p>
        </Link>
        <Link href="/account?tab=profiles" className="card card-lift">
          <p className="card-kicker">{t(locale, "account.playerProfiles")}</p>
          <p className="card-amount num">{account.profiles.length}</p>
          <p className="card-desc">{t(locale, "account.profilesLede")}</p>
        </Link>
      </div>

      <nav className="segmented segmented-4 mt-6" aria-label={t(locale, "account.overview")}>
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/account?tab=${item.key}`}
            className="segment"
            aria-current={tab === item.key ? "true" : undefined}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "wallet" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display-2">{t(locale, "account.walletTitle")}</h2>
              <p className="lede mt-2 text-sm">{t(locale, "account.walletLede")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="coin-chip">
                <Icon name="coins" size={16} />
                <span className="num">{account.wallet.coinBalance}</span>
                <Coin size={18} />
              </span>
              {account.fundingAvailable ? (
                <Link className="btn btn-primary" href="/account/fund">
                  <Icon name="wallet" size={15} />
                  {t(locale, "account.fundWallet")}
                </Link>
              ) : null}
            </div>
          </div>

          {account.entries.length === 0 ? (
            <p className="empty mt-4">{t(locale, "account.noMoves")}</p>
          ) : (
            <>
              <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
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
              <div className="table-cards mt-4">
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
          )}
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display-2">{t(locale, "account.orders")}</h2>
              <p className="lede mt-2 text-sm">{t(locale, "account.ordersLede")}</p>
            </div>
            <span className="hud-chip">
              <Icon name="receipt" size={12} />
              {account.orders.length}
            </span>
          </div>

          {account.orders.length === 0 ? (
            <p className="empty mt-4">{t(locale, "account.noOrders")}</p>
          ) : (
            <>
              <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
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
                          <span className="amount" dir="ltr">{`${(order.price.minor / 100).toFixed(2)} ${currency}`}</span>
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
              <div className="table-cards mt-4">
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
                        <span className="num" dir="ltr">{`${(order.price.minor / 100).toFixed(2)} ${currency}`}</span>
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
          )}
        </section>
      ) : null}

      {tab === "profiles" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display-2">{t(locale, "account.playerProfiles")}</h2>
              <p className="lede mt-2 text-sm">{t(locale, "account.profilesLede")}</p>
            </div>
            <Link className="btn btn-primary" href="/account/profiles">
              <Icon name="plus" size={15} /> {t(locale, "account.manageProfiles")}
            </Link>
          </div>

          {account.profiles.length === 0 ? (
            <p className="empty mt-4">{t(locale, "account.noProfiles")}</p>
          ) : (
            <div className="stagger mt-6 grid gap-4 sm:grid-cols-2">
              {account.profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} locale={locale} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "levels" ? (
        <section className="mt-6">
          <div>
            <h2 className="display-2">{t(locale, "account.levelsTitle")}</h2>
            <p className="lede mt-2 text-sm">{t(locale, "account.levelsLede")}</p>
          </div>
          <LevelsPanel levels={account.levels} locale={locale} />
        </section>
      ) : null}
    </main>
  )
}
