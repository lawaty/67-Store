/**
 * Management user detail route at /management/users/[id]: renders account
 * info, wallet history, and the wallet adjustment form.
 */
import { notFound } from "next/navigation"
import { adminGet } from "@/frontend/admin"
import { ApiError } from "@/frontend/api"
import type { AdminUserDetailDto } from "@/api/contracts"
import { Icon } from "@/app/icons"
import { statusClass, statusLabel } from "@/app/status-label"
import { formatMinor } from "@/frontend/format"
import { ClickableCard, ClickableRow } from "../../../clickable-row"
import { WalletAdjustModal } from "../wallet-adjust-modal"
import { VipOverrideModal } from "../vip-override-modal"

export const dynamic = "force-dynamic"

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("ar-EG")
  } catch {
    return value
  }
}

function formatPercent(basisPoints: number): string {
  const percent = basisPoints / 100
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2).replace(/\.?0+$/, "")}%`
}

function currencyLabel(currency: string): string {
  return currency === "USD" ? "USDT" : currency
}

function formatMoney(minor: number, currency: string): string {
  return `${formatMinor(minor, currency)} ${currencyLabel(currency)}`
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string; overrideOk?: string; overrideError?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const data = await adminGet<AdminUserDetailDto>(`/api/admin/users/${encodeURIComponent(id)}`).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound()
      throw error
    },
  )

  return (
    <main dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <a className="btn btn-ghost btn-sm" href="/management/users">
          <span className="rtl:-scale-x-100"><Icon name="chevron-left" size={15} /></span>
          رجوع للمستخدمين
        </a>
        <span className="hud-chip"><Icon name="user" size={12} />مستخدم</span>
      </div>

      <header>
        <p className="eyebrow"><Icon name="user" size={12} />ملف المستخدم</p>
        <h1 className="display-2 mt-3 break-all">{data.account.username}</h1>
        <p className="mt-2 text-sm text-muted">{data.account.email}</p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <p className="eyebrow">إجمالي الطلبات</p>
          <p className="num mt-2 text-xl font-bold text-ink" dir="ltr">{data.stats.totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <p className="eyebrow">إجمالي الكمية المدفوعة</p>
          <p className="num mt-2 text-xl font-bold text-ink" dir="ltr">{data.stats.totalPaidCoins}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <p className="eyebrow">الكمية المدفوعة هذا الشهر</p>
          <p className="num mt-2 text-xl font-bold text-ink" dir="ltr">{data.stats.monthlyPaidCoins}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <p className="eyebrow">المستوى الحالي</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold">{data.level.title}</span>
            <span className="num text-sm font-bold text-ink" dir="ltr">{formatPercent(data.markupBasisPoints)}</span>
          </div>
        </div>
      </div>

      {sp.ok === "1" ? <p className="notice mt-4">تم تعديل المحفظة بنجاح.</p> : null}
      {sp.error === "insufficient" ? <p className="alert mt-4">الرصيد ما يكفي.</p> : null}
      {sp.error && sp.error !== "insufficient" ? <p className="alert mt-4">تحقق من البيانات المدخلة.</p> : null}
      {sp.overrideOk === "1" ? <p className="notice mt-4">تم حفظ هامش العميل.</p> : null}
      {sp.overrideError ? <p className="alert mt-4">ما قدرناش نحفظ هامش العميل. تحقق من النسبة.</p> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">المحفظة</p>
                <h2 className="display-2 mt-1">آخر الحركات</h2>
              </div>
              <span className="coin-chip">
                <Icon name="coins" size={16} />
                <span className="num">{data.wallet.coinBalance}</span>
              </span>
            </div>

            {data.entries.length === 0 ? (
              <p className="empty mt-4">مفيش حركات بعد.</p>
            ) : (
              <>
                <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>الحركة</th>
                        <th>السبب</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span className={entry.amount > 0 ? "num font-bold text-jade" : "num font-bold text-danger"} dir="ltr">
                              {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                            </span>
                          </td>
                          <td className="font-semibold">{entry.reason}</td>
                          <td><span className="num text-sm text-muted">{formatDate(entry.createdAt)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards mt-4">
                  {data.entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                      <div className="flex items-start justify-between gap-3">
                        <span className={entry.amount > 0 ? "num text-sm font-bold text-jade" : "num text-sm font-bold text-danger"} dir="ltr">
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </span>
                        <span className="num text-xs text-muted">{formatDate(entry.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{entry.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <h2 className="text-base font-bold text-ink">سجل الطلبات</h2>
            {data.orders.length === 0 ? (
              <p className="empty mt-4">لا توجد طلبات</p>
            ) : (
              <>
                <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>الطلب</th>
                        <th>المنتج</th>
                        <th>الملف</th>
                        <th>السعر</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((order) => (
                        <ClickableRow key={order.token} href={`/order/${order.token}`}>
                          <td>
                            <a className="num font-semibold text-ink underline decoration-line underline-offset-4" href={`/order/${order.token}`}>
                              {order.token.slice(0, 8).toUpperCase()}
                            </a>
                          </td>
                          <td className="font-semibold">{order.productName}</td>
                          <td className="num text-sm text-muted">{order.game.toUpperCase()} · {order.userId}/{order.serverId}</td>
                          <td><span className="num font-bold" dir="ltr">{formatMoney(order.price.minor, order.price.currency)}</span></td>
                          <td><span className={statusClass(order.status)}>{statusLabel(order.status)}</span></td>
                          <td><span className="num text-sm text-muted">{formatDate(order.createdAt ?? "")}</span></td>
                        </ClickableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards mt-4">
                  {data.orders.map((order) => (
                    <ClickableCard key={order.token} href={`/order/${order.token}`} className="block cursor-pointer rounded-2xl border border-line bg-surface p-4 shadow-e1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="num text-sm font-bold text-ink">{order.token.slice(0, 8).toUpperCase()}</span>
                        <span className={statusClass(order.status)}>{statusLabel(order.status)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{order.productName}</p>
                      <p className="num mt-1 text-sm text-muted">{order.game.toUpperCase()} · {order.userId}/{order.serverId}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="num font-bold" dir="ltr">{formatMoney(order.price.minor, order.price.currency)}</span>
                        <span className="num text-sm text-muted">{formatDate(order.createdAt ?? "")}</span>
                      </div>
                    </ClickableCard>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <p className="eyebrow">VIP</p>
            <h2 className="mt-1 text-base font-bold text-ink">مستوى العميل</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">العملات المستهلكة (30 يوم)</dt>
                <dd className="num font-bold text-ink" dir="ltr">{data.coinsConsumed30d}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">الهامش الحالي (MLBB)</dt>
                <dd className="num font-bold text-ink" dir="ltr">{formatPercent(data.markupBasisPoints)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">الحد التالي</dt>
                <dd className="text-ink">
                  {data.nextBreakpoint === null ? (
                    "أعلى مستوى"
                  ) : (
                    <span>
                      <span className="num" dir="ltr">+{Math.max(0, data.nextBreakpoint.coins - data.coinsConsumed30d)}</span>{" "}
                      عملة → <span className="num" dir="ltr">{formatPercent(data.nextBreakpoint.basisPoints)}</span>
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">هامش مخصص</dt>
                <dd className={data.override ? "font-semibold text-amber-700" : "text-muted"}>
                  {data.override ? "مفعّل" : "غير مفعّل"}
                </dd>
              </div>
            </dl>
            {data.override ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950">
                <p>
                  هامش مخصص: <span className="num font-bold" dir="ltr">{formatPercent(data.override.basisPoints)}</span>
                </p>
                {data.override.note ? <p className="mt-1 text-amber-900">{data.override.note}</p> : null}
                <p className="num mt-1 text-sm text-amber-800">{formatDate(data.override.updatedAt)}</p>
              </div>
            ) : null}

            <div className="mt-4">
              <VipOverrideModal
                accountId={data.account.id}
                defaultPercent={data.override ? data.override.basisPoints / 100 : data.markupBasisPoints / 100}
                defaultNote={data.override?.note ?? ""}
                hasOverride={data.override !== null}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <h2 className="text-base font-bold text-ink">تعديل المحفظة</h2>
            <div className="mt-4">
              <WalletAdjustModal clientId={data.account.clientId} accountId={data.account.id} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
