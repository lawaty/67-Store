/**
 * Management coin-deposits route at /management/coins: renders the purchase
 * operations log with a compact add-purchase dialog.
 */
import { adminGet } from "@/frontend/admin"
import type { TreasuryDashboardDto } from "@/api/contracts"
import { PurchaseModal } from "./purchase-modal"
import { Icon } from "@/app/icons"
import { formatMinor } from "@/frontend/format"

export const dynamic = "force-dynamic"

function currencyLabel(currency: string): string {
  return currency === "USD" ? "USDT" : currency
}

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const params = await searchParams
  const data = await adminGet<TreasuryDashboardDto>("/api/admin/treasury")

  const deposits = [...data.deposits].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="coins" size={12} />العملات</p>
          <h1 className="display-2 mt-3">عمليات شراء العملات</h1>
          <p className="lede mt-2 text-sm">شراء العميل للعملات مقابل دفع نقدي؛ ليس تمويل خزينة.</p>
        </div>
        <PurchaseModal />
      </header>

      {params.error === "deposit" ? (
        <p className="alert mt-4">ما قدرناش نسجل الإيداع. تحقق من رصيد الخزينة ومن صحة البيانات.</p>
      ) : null}
      {params.ok === "deposit" ? (
        <p className="notice mt-4">تم تسجيل الإيداع</p>
      ) : null}

      <section className="mt-6" aria-label="سجل العمليات">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">سجل العمليات</h2>
          <span className="hud-chip">{deposits.length} حركة</span>
        </div>
        {deposits.length === 0 ? (
          <p className="empty mt-3">مفيش عمليات شراء</p>
        ) : (
          <>
            <div className="table-desktop mt-3 overflow-hidden rounded-2xl border border-line">
              <table className="table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المرجع</th>
                    <th>العميل</th>
                    <th>المدفوع</th>
                    <th>السعر</th>
                    <th>العملات</th>
                    <th>قيمة EGP</th>
                    <th>WAC</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td><span className="num text-sm text-muted">{d.createdAt}</span></td>
                      <td><span className="num text-sm" dir="ltr">{d.id}</span></td>
                      <td><span className="num text-sm">{d.clientId}</span></td>
                      <td>
                        <span className="num" dir="ltr">{formatMinor(d.amountMinor, d.currency)}</span>{" "}
                        <span className="hud-chip">{currencyLabel(d.currency)}</span>
                      </td>
                      <td><span className="num" dir="ltr">{formatMinor(d.rateMinor, d.currency)}</span></td>
                      <td><span className="num font-bold" dir="ltr">{d.coins}</span></td>
                      <td><span className="num" dir="ltr">{formatMinor(d.egpValueMinor, "EGP")}</span></td>
                      <td><span className="num" dir="ltr">{formatMinor(d.wacEgpMinor, "EGP")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-cards mt-3">
              {deposits.map((d) => (
                <article key={d.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hud-chip">{currencyLabel(d.currency)}</span>
                    <span className="num text-xs text-muted">{d.createdAt}</span>
                  </div>
                  <p className="num mt-2 text-sm text-muted" dir="ltr">{d.id}</p>
                  <p className="num mt-1 text-sm text-muted">{d.clientId}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div><p className="card-kicker">المدفوع</p><p className="num mt-1 text-sm font-bold text-ink">{formatMinor(d.amountMinor, d.currency)} {currencyLabel(d.currency)}</p></div>
                    <div><p className="card-kicker">العملات</p><p className="num mt-1 text-sm font-bold text-ink">{d.coins}</p></div>
                    <div><p className="card-kicker">السعر</p><p className="num mt-1 text-sm text-muted">{formatMinor(d.rateMinor, d.currency)}</p></div>
                    <div><p className="card-kicker">قيمة EGP</p><p className="num mt-1 text-sm text-muted">{formatMinor(d.egpValueMinor, "EGP")}</p></div>
                    <div><p className="card-kicker">WAC</p><p className="num mt-1 text-sm text-muted">{formatMinor(d.wacEgpMinor, "EGP")}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
