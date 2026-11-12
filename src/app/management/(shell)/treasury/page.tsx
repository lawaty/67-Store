/**
 * Management treasury route at /management/treasury: renders the funding
 * form and one merged log of treasury credits (funding) and debits (order
 * consumption).
 */
import { adminGet } from "@/frontend/admin"
import type { TreasuryDashboardDto } from "@/api/contracts"
import { FundingModal } from "./funding-modal"
import { RollbackFundingButton } from "./rollback-funding-button"
import { Icon } from "@/app/icons"
import { formatMinor, formatUsdtMilli } from "@/frontend/format"
import { USDT_MILLI_PER_USDT } from "@/shared/usdt"
import { inferredEgpPerUsdtMinor } from "@/shared/funding"

export const dynamic = "force-dynamic"

type OperationRow =
  | {
      key: string
      createdAt: string
      type: "تمويل"
      id: string
      usdtInMilli: number
      usdtOutMilli: null
      egpMinor: number
      wacEgpMinor: number
    }
  | {
      key: string
      createdAt: string
      type: "خصم طلب"
      usdtInMilli: null
      usdtOutMilli: number
      egpMinor: number
      wacEgpMinor: number
    }

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const params = await searchParams
  const data = await adminGet<TreasuryDashboardDto>("/api/admin/treasury")

  const operations: OperationRow[] = [
    ...data.fundings.map(
      (f): OperationRow => ({
        key: `funding-${f.id}`,
        createdAt: f.createdAt,
        type: "تمويل",
        id: f.id,
        usdtInMilli: f.usdtMilli,
        usdtOutMilli: null,
        egpMinor: f.egpPaidMinor,
        wacEgpMinor: inferredEgpPerUsdtMinor(f.egpPaidMinor, f.usdtMilli),
      }),
    ),
    ...data.consumptions.map(
      (c): OperationRow => ({
        key: `consumption-${c.id}`,
        createdAt: c.createdAt,
        type: "خصم طلب",
        usdtInMilli: null,
        usdtOutMilli: c.usdtMilli,
        egpMinor: c.basisEgpMinor,
        wacEgpMinor: c.wacEgpMinor,
      }),
    ),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const defaultUsdtMilli = data.freeUsdtMilli
  const maxP2pEgpPerUsdtMinor = data.p2pMaxEgpPerUsdtMinor
  const defaultEgpPaidMinor =
    maxP2pEgpPerUsdtMinor !== null && defaultUsdtMilli > 0
      ? Math.round((maxP2pEgpPerUsdtMinor * defaultUsdtMilli) / USDT_MILLI_PER_USDT)
      : 0

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow"><Icon name="coins" size={12} />الخزينة</p>
          <h1 className="display-2 mt-3">عمليات الخزينة</h1>
          <p className="lede mt-2 text-sm">تمويل الخزينة وسجل حركة USDT.</p>
        </div>
        <FundingModal defaultEgpPaidMinor={defaultEgpPaidMinor} defaultUsdtMilli={defaultUsdtMilli} maxUsdtMilli={data.freeUsdtMilli} />
      </header>

      {params.error === "free" ? (
        <p className="alert mt-4">الكمية أكبر من USDT الحر المتاح</p>
      ) : params.error === "locked" ? (
        <p className="alert mt-4">مش ممكن التراجع: الحركة مرتبطة بأرصدة أو عملات محجوزة.</p>
      ) : params.error === "not_found" ? (
        <p className="alert mt-4">حركة التمويل مش موجودة.</p>
      ) : params.error ? (
        <p className="alert mt-4">بيانات غير صحيحة</p>
      ) : null}
      {params.ok === "rolledback" ? (
        <p className="notice mt-4">تم التراجع عن التمويل</p>
      ) : params.ok ? (
        <p className="notice mt-4">تم تسجيل التمويل</p>
      ) : null}

      <section className="mt-6" aria-label="سجل عمليات الخزينة">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">سجل العمليات</h2>
          <span className="hud-chip">{operations.length} حركة</span>
        </div>
        {operations.length === 0 ? (
          <p className="empty mt-3">مفيش عمليات</p>
        ) : (
          <>
            <div className="table-desktop mt-3 overflow-hidden rounded-2xl border border-line">
              <table className="table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>USDT داخل</th>
                    <th>USDT خارج</th>
                    <th>EGP</th>
                    <th>WAC</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((row) => (
                    <tr key={row.key}>
                      <td><span className="num text-sm text-muted">{row.createdAt}</span></td>
                      <td><span className="hud-chip">{row.type}</span></td>
                      <td>
                        {row.usdtInMilli === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="num font-bold text-jade" dir="ltr">{formatUsdtMilli(row.usdtInMilli)}</span>
                        )}
                      </td>
                      <td>
                        {row.usdtOutMilli === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="num font-bold" dir="ltr">{formatUsdtMilli(row.usdtOutMilli)}</span>
                        )}
                      </td>
                      <td><span className="num" dir="ltr">{formatMinor(row.egpMinor, "EGP")}</span></td>
                      <td><span className="num" dir="ltr">{formatMinor(row.wacEgpMinor, "EGP")}</span></td>
                      <td>
                        {row.type === "تمويل" ? (
                          <RollbackFundingButton id={row.id} usdtMilli={row.usdtInMilli} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-cards mt-3">
              {operations.map((row) => (
                <article key={row.key} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hud-chip">{row.type}</span>
                    <span className="num text-xs text-muted">{row.createdAt}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="card-kicker">USDT داخل</p>
                      <p className="num mt-1 text-sm font-bold text-jade">
                        {row.usdtInMilli === null ? "—" : formatUsdtMilli(row.usdtInMilli)}
                      </p>
                    </div>
                    <div>
                      <p className="card-kicker">USDT خارج</p>
                      <p className="num mt-1 text-sm font-bold text-ink">
                        {row.usdtOutMilli === null ? "—" : formatUsdtMilli(row.usdtOutMilli)}
                      </p>
                    </div>
                    <div><p className="card-kicker">EGP</p><p className="num mt-1 text-sm font-bold text-ink">{formatMinor(row.egpMinor, "EGP")}</p></div>
                    <div><p className="card-kicker">WAC</p><p className="num mt-1 text-sm text-muted">{formatMinor(row.wacEgpMinor, "EGP")}</p></div>
                  </div>
                  {row.type === "تمويل" ? (
                    <div className="mt-3">
                      <RollbackFundingButton id={row.id} usdtMilli={row.usdtInMilli} />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
