/**
 * /management/orders route: renders the admin order list with status/date
 * filters, search, and pagination from the admin orders read model.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminOrderPageDto, OrderStatusDto } from "@/api/contracts"
import { statusClass, statusLabel } from "@/app/status-label"
import { Icon } from "@/app/icons"
import { formatMinor, formatUsdtMilli } from "@/frontend/format"
import { ClickableCard, ClickableRow } from "../../clickable-row"
import { Avatar } from "@/app/avatar"

export const dynamic = "force-dynamic"

const ALL_STATUSES: OrderStatusDto[] = [
  "CREATED",
  "AWAITING_PAYMENT",
  "PAID",
  "FULFILLING",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]

function currencyLabel(currency: string): string {
  return currency === "USD" ? "USDT" : currency
}
function formatMoney(minor: number, currency: string): string {
  return `${formatMinor(minor, currency)} ${currencyLabel(currency)}`
}
function formatExactCost(usdtMilli: number, currency: string): string {
  return `${formatUsdtMilli(usdtMilli)} ${currencyLabel(currency)}`
}

function formatDate(value: string | null) {
  if (value === null) return ""
  const date = new Date(value)
  try {
    return date.toLocaleString("ar-EG")
  } catch {
    return date.toISOString()
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || "1") || 1)
  const from = params.from?.trim() ?? ""
  const to = params.to?.trim() ?? ""
  const q = params.q?.trim() ?? ""

  const search = new URLSearchParams()
  if (params.status && params.status !== "ALL") search.set("status", params.status)
  if (from !== "") search.set("from", from)
  if (to !== "") search.set("to", to)
  if (q !== "") search.set("q", q)
  if (page > 1) search.set("page", String(page))
  const query = search.toString()

  const { rows, total, skip } = await adminGet<AdminOrderPageDto>(
    `/api/admin/orders${query === "" ? "" : `?${query}`}`,
  )

  const buildUrl = (target: number) => {
    const sp = new URLSearchParams()
    if (params.status && params.status !== "ALL") sp.set("status", params.status)
    if (from !== "") sp.set("from", from)
    if (to !== "") sp.set("to", to)
    if (q !== "") sp.set("q", q)
    if (target > 1) sp.set("page", String(target))
    const qs = sp.toString()
    return `/management/orders${qs === "" ? "" : `?${qs}`}`
  }

  const hasDiscountOrCost =
    rows.some((row) => row.discountMinor !== null) ||
    rows.some((row) => row.costMinor !== null) ||
    rows.some((row) => row.costUsdtMilli !== null)

  return (
    <main dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="receipt" size={12} />الإدارة</p>
          <h1 className="display-2 mt-3">الطلبات</h1>
        </div>
        <span className="hud-chip"><Icon name="receipt" size={12} />{total} طلب</span>
      </header>

      <form method="get" className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-e1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="field">
            <label htmlFor="status">الحالة</label>
            <select id="status" name="status" defaultValue={params.status || "ALL"}>
              <option value="ALL">الكل</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="from">من</label>
            <input id="from" type="date" name="from" defaultValue={from} />
          </div>
          <div className="field">
            <label htmlFor="to">إلى</label>
            <input id="to" type="date" name="to" defaultValue={to} />
          </div>
          <div className="field lg:col-span-2">
            <label htmlFor="q">بحث</label>
            <input id="q" type="text" name="q" placeholder="التوكن / معرّف المستخدم / معرّف السيرفر" defaultValue={q} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="submit" className="btn btn-primary"><Icon name="search" size={15} /> تصفية</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="empty mt-4">مفيش نتائج مطابقة.</p>
      ) : (
        <>
          <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>المستخدم</th>
                  <th>اسم المنتج</th>
                  <th>الملف</th>
                  <th>السعر</th>
                  {hasDiscountOrCost ? <th>الخصم</th> : null}
                  {hasDiscountOrCost ? <th>التكلفة</th> : null}
                  <th>الحالة</th>
                  <th>تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <ClickableRow key={order.id} href={`/order/${order.token}`}>
                    <td>
                      <a className="num text-sm font-bold text-ember hover:underline" href={`/order/${order.token}`}>
                        {order.token.slice(0, 8).toUpperCase()}
                      </a>
                    </td>
                    <td>
                      <div className="relative group inline-flex items-center gap-2">
                        <Avatar name={order.user.username ?? "?"} size="sm" />
                        {order.user.id !== null ? (
                          <a href={`/management/users/${order.user.id}`} className="text-sm font-semibold text-ember hover:underline">
                            {order.user.username ?? "—"}
                          </a>
                        ) : (
                          <span className="text-sm">{order.user.username ?? "ضيف"}</span>
                        )}
                        <div className="absolute z-30 start-0 top-full mt-2 w-56 rounded-xl border border-line bg-surface p-3 shadow-e2 opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition">
                          <div className="flex items-center gap-3">
                            <Avatar name={order.user.username ?? "?"} size="md" />
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate">{order.user.username ?? "ضيف"}</p>
                              <p className="text-sm text-muted truncate" dir="ltr">{order.user.email ?? "—"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold">{order.productName}</td>
                    <td>
                      <span className="num text-sm" dir="ltr">
                        {`${order.profile.game.toUpperCase()} · ${order.profile.userId}/${order.profile.serverId}`}
                      </span>
                    </td>
                    <td><span className="num font-bold" dir="ltr">{formatMoney(order.price.minor, order.price.currency)}</span></td>
                    {hasDiscountOrCost ? (
                      <td>{order.discountMinor !== null ? <span className="num" dir="ltr">{formatMoney(order.discountMinor, order.price.currency)}</span> : "-"}</td>
                    ) : null}
                    {hasDiscountOrCost ? (
                      <td>
                        {order.costUsdtMilli != null ? (
                          <span className="num" dir="ltr">{formatExactCost(order.costUsdtMilli, order.price.currency)}</span>
                        ) : order.costMinor !== null ? (
                          <span className="num" dir="ltr">{formatMoney(order.costMinor, order.price.currency)}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    ) : null}
                    <td><span className={statusClass(order.status)}>{statusLabel(order.status)}</span></td>
                    <td><span className="num text-sm text-muted">{formatDate(order.createdAt)}</span></td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-cards mt-4">
            {rows.map((order) => (
              <ClickableCard key={order.id} href={`/order/${order.token}`} className="rounded-2xl border border-line bg-surface p-4 shadow-e1 transition hover:border-ember/30 cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <a href={`/order/${order.token}`} className="num text-sm font-bold text-ember hover:underline">
                    #{order.token.slice(0, 8).toUpperCase()}
                  </a>
                  <span className={statusClass(order.status)}>{statusLabel(order.status)}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-ink">{order.productName}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar name={order.user.username ?? "?"} size="sm" />
                    <div className="min-w-0">
                      {order.user.id !== null ? (
                        <a href={`/management/users/${order.user.id}`} className="font-semibold text-ember hover:underline">
                          {order.user.username ?? "—"}
                        </a>
                      ) : (
                        <span className="font-semibold">{order.user.username ?? "ضيف"}</span>
                      )}
                      <p className="text-xs text-muted truncate" dir="ltr">{order.user.email ?? "—"}</p>
                    </div>
                  </div>
                  <p className="num text-xs text-muted" dir="ltr">
                    {`${order.profile.game.toUpperCase()} · ${order.profile.userId}/${order.profile.serverId}`}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="num text-sm font-bold text-ink" dir="ltr">{formatMoney(order.price.minor, order.price.currency)}</span>
                  <span className="num text-xs text-muted">{formatDate(order.createdAt)}</span>
                </div>
              </ClickableCard>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>{page > 1 ? <a className="btn btn-ghost" href={buildUrl(page - 1)}>السابق</a> : null}</div>
        <span className="hud-chip">صفحة {page}</span>
        <div>{skip + rows.length < total ? <a className="btn btn-ghost" href={buildUrl(page + 1)}>التالي</a> : null}</div>
      </div>
    </main>
  )
}
