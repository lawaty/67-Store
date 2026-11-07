/**
 * Order status route for a given token; renders the order timeline, player card, and receipt.
 */
import Link from "next/link"
import { notFound } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { OrderDto, OrderStatusDto } from "@/api/contracts"
import { statusClass, statusLabel } from "@/app/status-label"
import { Icon } from "@/app/icons"
import { Toast } from "@/app/toast"
import { getLocale } from "@/i18n/server"
import { t } from "@/i18n/dictionary"
import { CopyLink } from "./copy-link"

export const dynamic = "force-dynamic"

const rank: Record<OrderStatusDto, number> = {
  CREATED: 0,
  AWAITING_PAYMENT: 0,
  PAID: 1,
  FULFILLING: 2,
  DELIVERED: 3,
  FAILED: 1,
  EXPIRED: 0,
  REFUNDED: 1,
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const locale = await getLocale()

  const order = await (await serverApi())
    .get<OrderDto>(`/api/orders/${encodeURIComponent(token)}`)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound()
      throw error
    })

  const usd = `${(order.price.minor / 100).toFixed(2)} ${order.price.currency}`
  const egp = `${(order.egp.minor / 100).toFixed(2)} ${order.egp.currency}`
  const currency = t(locale, "common.currency")
  const discount = order.discountEgp === null ? "" : `${(order.discountEgp.minor / 100).toFixed(2)} ${currency}`
  const monogram = (order.playerName ?? "").trim().charAt(0).toUpperCase() || "?"
  const current = rank[order.status]
  const stepState = (index: number) =>
    order.status === "DELIVERED" ? "done" : index < current ? "done" : index === current ? "active" : "pending"

  const steps = [
    { label: t(locale, "order.statusCreated"), body: t(locale, "order.timeline.createdBody") },
    { label: t(locale, "order.statusPaid"), body: t(locale, "order.timeline.paidBody") },
    { label: t(locale, "order.statusFulfilling"), body: t(locale, "order.timeline.fulfillingBody") },
    { label: t(locale, "order.statusDelivered"), body: t(locale, "order.timeline.deliveredBody") },
  ]

  return (
    <main className="page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="btn btn-ghost btn-sm" href="/products">
          <span className="rtl:-scale-x-100"><Icon name="chevron-left" size={15} /></span>
          {t(locale, "common.backToCatalogue")}
        </Link>
        <CopyLink locale={locale} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow"><Icon name="receipt" size={12} />{t(locale, "order.title")}</p>
              <h1 className="display-1 mt-3">{t(locale, "order.title")}</h1>
              <p className="lede mt-3">{t(locale, "order.keepNote")}</p>
            </div>
            <span className={statusClass(order.status)}>{statusLabel(order.status, locale)}</span>
          </header>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="hud-chip">
              {t(locale, "order.reference")} <span className="num text-ink">{order.token.slice(0, 8).toUpperCase()}</span>
            </span>
            <span className="hud-chip"><Icon name="package" size={11} />{order.productName}</span>
          </div>

          {order.status === "PAID" ? <Toast message={t(locale, "order.paymentReceived")} /> : null}
          {order.status === "DELIVERED" ? <Toast message={t(locale, "order.shippedSuccess")} /> : null}
          {order.status === "FAILED" || order.status === "REFUNDED" || order.status === "EXPIRED" ? (
            <div className="alert mt-4">{t(locale, "order.cannotComplete")}</div>
          ) : null}

          <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">{t(locale, "order.timeline")}</h2>
              <span className="hud-chip"><Icon name="clock" size={11} />{statusLabel(order.status, locale)}</span>
            </div>
            <div className="timeline mt-5">
              {steps.map((step, index) => {
                const state = stepState(index)
                return (
                  <div key={step.label} className="timeline-step" data-state={state}>
                    <span className="timeline-dot">
                      {state === "done" ? <Icon name="check" size={15} /> : <span className="num text-[11px]">{index + 1}</span>}
                    </span>
                    <div className="timeline-body">
                      <p className="text-sm font-bold text-ink">{step.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="player-card mt-4">
            <div className="flex items-center gap-3">
              <span className="player-monogram">{monogram}</span>
              <div className="min-w-0 flex-1">
                <p className="card-kicker">{t(locale, "order.playerCard")}</p>
                <p className="player-name truncate">{order.playerName ?? order.player.userId}</p>
                <div className="player-meta mt-1.5">
                  <span className="hud-chip"><Icon name="user" size={11} /><span className="num">{order.player.userId}</span></span>
                  <span className="hud-chip"><Icon name="grid" size={11} /><span className="num">{order.player.serverId}</span></span>
                </div>
              </div>
              {order.playerName ? (
                <span className="hud-chip border-jade/30 bg-jade/10 text-jade">
                  <Icon name="check-circle" size={12} />
                  {t(locale, "order.verifiedPlayer")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink">{t(locale, "order.receipt")}</h2>
              <Icon name="receipt" size={18} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-semibold text-muted">{t(locale, "order.product")}</dt>
                <dd className="text-end font-bold text-ink">{order.productName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-semibold text-muted">{t(locale, "order.player")}</dt>
                <dd className="num text-end text-xs font-bold text-ink">{order.player.userId} / {order.player.serverId}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-semibold text-muted">{t(locale, "order.status")}</dt>
                <dd><span className={statusClass(order.status)}>{statusLabel(order.status, locale)}</span></dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-4">
              <p className="card-kicker">{t(locale, "order.price")}</p>
              <p className="price mt-1">{usd}</p>
              <p className="mt-1 text-sm text-muted" dir="ltr">{egp}</p>
            </div>
            {order.discountEgp !== null ? (
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
                <span className="text-xs text-muted">
                  {t(locale, "order.discount")}{order.promoCode ? ` · ${order.promoCode}` : ""}
                </span>
                <strong className="text-sm text-jade" dir="ltr">− {discount}</strong>
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl border border-line bg-surface/60 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <Icon name="lock" size={14} />
              {t(locale, "order.keepNote")}
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
