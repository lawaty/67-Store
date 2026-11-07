/**
 * /management/products route: renders the admin product catalogue with sync
 * controls and product status details.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminProductDto } from "@/api/contracts"
import { syncCatalogue } from "../actions"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import PartitionBar from "../viz/partition-bar"

export const dynamic = "force-dynamic"

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "-"
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function ProductsPage() {
  const { products } = await adminGet<{ products: readonly AdminProductDto[] }>("/api/admin/products")

  const total = products.length
  const activeCount = products.filter((product) => product.active).length
  const buyableCount = products.filter((p) => p.buyable).length
  const activeBlockedCount = products.filter((p) => p.active && !p.buyable).length
  const inactiveCount = products.filter((p) => !p.active).length

  const synced = products.map((product) => product.syncedAt).filter((value): value is string => value !== null)
  const oldest = synced.length > 0 ? synced.reduce((a, b) => (a < b ? a : b)) : null
  const newest = synced.length > 0 ? synced.reduce((a, b) => (a > b ? a : b)) : null

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="package" size={12} />الكتالوج</p>
          <h1 className="display-2 mt-3">المنتجات</h1>
          <p className="lede mt-2 text-sm">قائمة كل منتجات الكتالوج للمتجر.</p>
        </div>
        <form action={syncCatalogue}>
          <SubmitButton className="btn btn-primary"><Icon name="bolt" size={15} /> مزامنة الكتالوج</SubmitButton>
        </form>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">الكتالوج</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hud-chip">إجمالي المنتجات {total}</span>
          <span className="hud-chip">نشط {activeCount}</span>
          <span className="hud-chip">غير نشط {inactiveCount}</span>
          <span className="hud-chip"><Icon name="refresh" size={11} />أقدم {formatDateTime(oldest)} · أحدث {formatDateTime(newest)}</span>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink">جاهزية البيع</h2>
            <span className="hud-chip">من إجمالي {total}</span>
          </div>
          <PartitionBar
            total={{ label: "إجمالي المنتجات", minor: total }}
            parts={[
              { label: "قابل للشراء", minor: buyableCount, tone: "jade" },
              { label: "نشط لكن محجوب", minor: activeBlockedCount, tone: "gold" },
              { label: "غير نشط", minor: inactiveCount, tone: "muted" },
            ]}
            formatValue={(value) => String(value)}
          />
        </div>
      ) : null}

      <p className="mt-2 text-sm text-muted">الصفحة دي للعرض فقط؛ مزامنة الكتالوج تفعّل أو تعطّل المنتجات تلقائياً ولا تحفظ التبديل اليدوي.</p>

      {products.length === 0 ? (
        <p className="empty mt-3">مفيش منتجات بعد. زامن من لوحة التحكم.</p>
      ) : (
        <>
          <div className="table-desktop mt-3 overflow-hidden rounded-2xl border border-line">
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>تكلفة الموزع (USD)</th>
                  <th>الحالة</th>
                  <th>آخر مزامنة</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-semibold">{product.name}</td>
                    <td><span className="num" dir="ltr">{(product.cost.minor / 100).toFixed(2)}</span></td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {product.buyable ? (
                          <span className="badge badge-paid">قابل للشراء</span>
                        ) : (
                          <span className="badge">غير قابل للشراء</span>
                        )}
                        {product.unavailableReason === "insufficient_funds" ? (
                          <span className="text-sm text-muted">
                            عجز تمويل: <span className="num" dir="ltr">{(product.fundingGapMinor / 100).toFixed(2)}</span> USDT
                          </span>
                        ) : null}
                        {product.unavailableReason === "inactive" ? (
                          <span className="text-sm text-muted">المنتج غير نشط</span>
                        ) : null}
                        {product.unavailableReason === "unknown_balance" ? (
                          <span className="text-sm text-muted">رصيد الخزينة غير معروف</span>
                        ) : null}
                      </div>
                    </td>
                    <td><span className="num text-sm text-muted">{formatDateTime(product.syncedAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-cards mt-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-ink">{product.name}</p>
                  {product.buyable ? (
                    <span className="badge badge-paid">قابل للشراء</span>
                  ) : (
                    <span className="badge">غير قابل للشراء</span>
                  )}
                </div>
                {product.unavailableReason === "insufficient_funds" ? (
                  <p className="mt-2 text-sm text-muted">
                    عجز تمويل: <span className="num" dir="ltr">{(product.fundingGapMinor / 100).toFixed(2)}</span> USDT
                  </p>
                ) : null}
                {product.unavailableReason === "inactive" ? <p className="mt-2 text-sm text-muted">المنتج غير نشط</p> : null}
                {product.unavailableReason === "unknown_balance" ? (
                  <p className="mt-2 text-sm text-muted">رصيد الخزينة غير معروف</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="num text-sm font-bold text-ink" dir="ltr">${(product.cost.minor / 100).toFixed(2)}</span>
                  <span className="num text-xs text-muted">{formatDateTime(product.syncedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
