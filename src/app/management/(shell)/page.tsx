/**
 * /management route: renders the financial position, trend chart, performance,
 * and projections from the admin dashboard read model.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminDashboardDto } from "@/api/contracts"
import { syncCatalogue } from "./actions"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import DashboardTrend from "./dashboard-trend"
import { CoinIndexCapModal } from "./coin-index-cap-modal"
import { formatIndex, formatMinor, formatUsdtMilli } from "@/frontend/format"
import BridgeBar from "./viz/bridge-bar"
import P2pPriceStrip from "./viz/p2p-price-strip"
import { P2pSettingsModal } from "./p2p-settings-modal"
import PartitionBar from "./viz/partition-bar"
import StatusChips from "./viz/status-chips"
import type { VizTone } from "./viz/types"

export const dynamic = "force-dynamic"

function p2pSourceLabel(source: AdminDashboardDto["p2p"] extends infer T ? (T extends { source: infer S } ? S : never) : never): string {
  if (source === "binance-p2p") return "مباشر"
  if (source === "settings:manual") return "يدوي"
  return "آخر قيمة"
}

export default async function AdminPage() {
  const data = await adminGet<AdminDashboardDto>("/api/admin/dashboard")

  const recorded = data.treasury.recordedUsdtMilli
  const free = data.treasury.freeUsdtMilli
  const available = data.treasury.availableUsdtMilli
  const live = data.balance?.usdMilli ?? null
  const wacEgpMinor = data.treasury.wacEgpMinor

  const statusItems: { label: string; tone: VizTone; detail?: string }[] = []
  if (data.balanceError) {
    statusItems.push({ label: "الرصيد المباشر ما يتوفر", tone: "danger" })
  }
  if (free > 0) {
    statusItems.push({ label: "USDT حر ما مسجل", tone: "gold", detail: formatUsdtMilli(free) })
  }
  if (available < 0) {
    statusItems.push({ label: "عجز في المسجل", tone: "danger", detail: formatUsdtMilli(available) })
  }
  if (data.treasury.coinIndexCapped) {
    statusItems.push({ label: "المؤشر مثبت عند الحد", tone: "gold" })
  }
  if (data.showWarning) {
    statusItems.push({ label: "الرصيد ما يكفي للطلبات", tone: "danger" })
  }
  if (statusItems.length === 0) {
    statusItems.push({ label: "المطابقة سليمة", tone: "jade" })
  }

  return (
    <main>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="display-2">لوحة التحكم</h1>
            <p className="lede mt-2 text-sm sm:text-base">ملخص الخزينة والأداء والتوقعات.</p>
          </div>
        </div>
        <form action={syncCatalogue}>
          <SubmitButton className="btn btn-primary">
            <Icon name="bolt" size={15} /> مزامنة الكتالوج
          </SubmitButton>
        </form>
      </header>

      {data.balanceError ? <p className="alert mt-4">ما قدرناش نقرأ رصيد الخزينة</p> : null}
      {!data.balanceError && data.showWarning ? (
        <p className="alert mt-4">الرصيد غير كافٍ لتنفيذ الطلبات — أضف رصيدًا لدى الخزينة.</p>
      ) : null}

      <section className="section" aria-label="الملاءة والتكلفة">
        <div className="mb-3">
          <p className="eyebrow">الملاءة والتكلفة</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="card">
            <div className="card-body">
              <p className="card-kicker">الملاءة</p>
              <h2 className="text-lg font-bold text-ink">الرصيد والتسوية</h2>
              <div className="mt-2">
                <StatusChips items={statusItems} />
              </div>
              <div className="mt-4 border-t border-line/60 pt-4">
                <p className="card-title">جسر التسوية</p>
                <p className="card-desc">من المسجل إلى الرصيد المباشر</p>
                <div className="mt-2">
                  <BridgeBar
                    total={{ label: "إجمالي الخزينة", minor: live }}
                    parts={[
                      { label: "مسجل", minor: recorded, tone: "jade" },
                      { label: "حر (غير مسجل)", minor: free, tone: "ember" },
                    ]}
                    format={formatUsdtMilli}
                  />
                </div>
              </div>
              <div className="mt-4 border-t border-line/60 pt-4">
                <p className="card-title">توزيع USDT المسجل</p>
                <div className="mt-2">
                  <PartitionBar
                    total={{ label: "المسجل", minor: recorded }}
                    parts={[
                      { label: "محجوز", minor: data.treasury.reservedUsdtMilli, tone: "sky" },
                      { label: "متاح", minor: available, tone: available < 0 ? "danger" : "jade" },
                    ]}
                    showTotal={false}
                    emptyLabel="مفيش USDT مسجل بعد"
                    format={formatUsdtMilli}
                  />
                </div>
              </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-line/60 pt-4">
              <span className="text-sm font-bold text-ink">WAC</span>
                <span className="num text-sm font-bold text-ink" dir="ltr">
                  {wacEgpMinor > 0 ? formatMinor(wacEgpMinor, "EGP") + " ج.م" : "—"}
                </span>
                <span className="card-desc">متوسط تكلفة USDT المسجل</span>
              </div>
              <a href="/management/treasury" className="btn btn-primary mt-4 inline-flex">تسجيل تمويل جديد</a>
            </div>
          </article>

          <div className="grid gap-4">
            <article className="card">
              <div className="card-body">
                <p className="card-kicker">السوق</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-ink">نطاق عروض P2P على Binance</h2>
                    <p className="card-desc">آخر {data.p2pSettings.windowHours} ساعة</p>
                  </div>
                  <P2pSettingsModal p2pSettings={data.p2pSettings} />
                </div>
                <div className="mt-2">
                  <P2pPriceStrip
                    range={data.p2p?.range ?? null}
                    currentEgpPerUsdtMinor={data.p2p?.egpPerUsdtMinor ?? null}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="muted">المصدر</span>
                  {data.p2p ? (
                    <>
                      <span>{p2pSourceLabel(data.p2p.source)}</span>
                      {data.p2p.stale ? <span className="badge">قديم</span> : null}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>
            </article>

            <article className="card">
              <div className="card-body">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="card-kicker">العملات</p>
                    <h2 className="text-lg font-bold text-ink">اقتصاد العملة</h2>
                  </div>
                  <CoinIndexCapModal coinIndexCapBps={data.treasury.coinIndexCapBps} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-wrap items-baseline gap-2 border-b border-line/60 pb-2">
                    <span className="text-sm font-bold text-muted">مؤشر العملة</span>
                    <span className="num text-lg font-bold text-ink" dir="ltr">{formatIndex(data.treasury.coinIndex)}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2 border-b border-line/60 pb-2">
                    <span className="text-sm font-bold text-muted">قيمة العملة</span>
                    <span className="num text-lg font-bold text-ink" dir="ltr">{formatMinor(data.treasury.coinValueUsdMinor, "USD") + " USD"}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-bold text-muted">العملات المحجوزة</span>
                    <span className="num text-lg font-bold text-ink" dir="ltr">{data.treasury.coinsOutstanding}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-bold text-muted">العملات المتاحة</span>
                    <span className="num text-lg font-bold text-ink" dir="ltr">{data.treasury.availableCoins}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <DashboardTrend
        p2p={data.history.p2p}
        wac={data.history.wac}
        profit={data.summary.series}
        series={data.summary.series}
        clientProjections={data.clientProjections}
        currentP2pMinor={data.p2p?.egpPerUsdtMinor ?? null}
      />
    </main>
  )
}
