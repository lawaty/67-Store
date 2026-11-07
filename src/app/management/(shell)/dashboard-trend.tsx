"use client"

import { useMemo, useState } from "react"
import type { AdminClientProjectionDto } from "@/api/contracts"
import TrendChart, {
  DOMAIN_OPTIONS,
  type Domain,
  type ProfitMode,
} from "./trend-chart"
import { PricingControls } from "./pricing-controls"
import { sliceDayWindow } from "./trend-chart-geometry"
import { formatMinor, formatBps } from "@/frontend/format"

const WINDOW_WIDTH_OPTIONS = [7, 14, 30] as const
type WindowWidth = (typeof WINDOW_WIDTH_OPTIONS)[number]
const WINDOW_WIDTH_LABELS: Record<WindowWidth, string> = {
  7: "٧ أيام",
  14: "١٤ يوم",
  30: "٣٠ يوم",
}

export type DashboardTrendProps = {
  readonly p2p: readonly {
    readonly day: string
    readonly hour?: string | number | null
    readonly egpPerUsdtMinor: number
    readonly minEgpPerUsdtMinor?: number
    readonly avgEgpPerUsdtMinor?: number
    readonly maxEgpPerUsdtMinor?: number
  }[]
  readonly wac: readonly { readonly day: string; readonly wacEgpMinor: number }[]
  readonly profit: readonly { readonly day: string; readonly marginUsdMinor: number }[]
  readonly series: readonly {
    readonly day: string
    readonly ordersCount: number
    readonly revenueUsdMinor: number
    readonly marginUsdMinor: number
    readonly coinsSold: number
  }[]
  readonly clientProjections: readonly AdminClientProjectionDto[]
  readonly windowOffsetDays?: number
  readonly onWindowOffsetChange?: (offset: number) => void
  readonly currentP2pMinor?: number | null
}

export default function DashboardTrend({
  p2p,
  wac,
  profit,
  series,
  clientProjections,
  windowOffsetDays: controlledOffset,
  onWindowOffsetChange,
  currentP2pMinor = null,
}: DashboardTrendProps) {
  const [domain, setDomain] = useState<Domain>("live-cost")
  const [profitMode, setProfitMode] = useState<ProfitMode>("daily")
  const [windowDays, setWindowDays] = useState<WindowWidth>(30)
  const [internalOffset, setInternalOffset] = useState(0)
  const rawOffset = controlledOffset ?? internalOffset
  const maxWindowOffsetDays = Math.max(0, series.length - windowDays)
  const windowOffsetDays = Math.min(rawOffset, maxWindowOffsetDays)
  const setWindowOffsetDays = (next: number) => {
    const clamped = Math.max(0, Math.min(maxWindowOffsetDays, Math.round(next)))
    onWindowOffsetChange?.(clamped)
    if (controlledOffset === undefined) setInternalOffset(clamped)
  }
  const handleWindowDaysChange = (next: WindowWidth) => {
    setWindowDays(next)
    const nextMax = Math.max(0, series.length - next)
    const clamped = Math.max(0, Math.min(nextMax, rawOffset))
    onWindowOffsetChange?.(clamped)
    if (controlledOffset === undefined) setInternalOffset(clamped)
  }

  const windowRows = useMemo(
    () => sliceDayWindow(series, windowOffsetDays, windowDays),
    [series, windowOffsetDays, windowDays],
  )
  const windowStartDay = windowRows[0]?.day ?? ""
  const windowEndDay = windowRows[windowRows.length - 1]?.day ?? ""

  const totals = useMemo(() => {
    let orders = 0
    let coins = 0
    let margin = 0
    for (const s of windowRows) {
      orders += s.ordersCount
      coins += s.coinsSold
      margin += s.marginUsdMinor
    }
    return { orders, coins, margin }
  }, [windowRows])

  return (
    <section className="section" aria-label="الأداء والتوقعات">
      <div className="mb-4 flex flex-col gap-3 border-b border-line/60 pb-4">
        <div>
          <h2 className="eyebrow">الأداء + التوقعات</h2>
          <p className="card-desc mt-1">
            نافذة{" "}
            <span data-testid="window-range" className="num text-ink" dir="ltr">
              {windowStartDay && windowEndDay ? `${windowStartDay} ↔ ${windowEndDay}` : "—"}
            </span>
          </p>
        </div>
        <div className="toolbar text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="muted">المجال</span>
              <select
                className="input min-w-[10rem] px-2 py-1 text-sm"
                aria-label="مجال الرسم البياني"
                value={domain}
                onChange={(e) => setDomain(e.target.value as Domain)}
              >
                {DOMAIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {domain === "profit" ? (
              <div className="segmented segmented-2" role="group" aria-label="وضع الربح">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={profitMode === "daily"}
                  onClick={() => setProfitMode("daily")}
                >
                  يومي
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={profitMode === "cumulative"}
                  onClick={() => setProfitMode("cumulative")}
                >
                  تراكمي
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="segmented" role="group" aria-label="عرض النافذة">
              {WINDOW_WIDTH_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="segment"
                  data-testid={`window-width-${opt}`}
                  aria-pressed={windowDays === opt}
                  onClick={() => handleWindowDaysChange(opt)}
                >
                  {WINDOW_WIDTH_LABELS[opt]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="segment"
              onClick={() => setWindowOffsetDays(0)}
              disabled={windowOffsetDays === 0}
            >
              الأحدث
            </button>
          </div>
        </div>
      </div>
      <TrendChart
        p2p={p2p}
        wac={wac}
        profit={profit}
        windowOffsetDays={windowOffsetDays}
        maxWindowOffsetDays={maxWindowOffsetDays}
        onWindowOffsetChange={setWindowOffsetDays}
        windowStartDay={windowStartDay}
        windowDays={windowDays}
        currentP2pMinor={currentP2pMinor}
        domain={domain}
        profitMode={profitMode}
      />

      <article className="card mt-4">
        <div className="card-body">
          <p className="card-kicker">الأداء</p>
          <h3 className="text-base font-bold text-ink">إجماليات النافذة</h3>
          <div className="mt-2">
            <PricingControls />
          </div>

          <div className="mt-3 grid gap-2 text-sm">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 pb-2">
              <span className="muted">المؤشر</span>
              <span className="muted">الإجمالي</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <span>إجمالي الطلبات</span>
              <span className="num font-bold text-ink" dir="ltr">{totals.orders}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <span>العملات المبيعة</span>
              <span className="num font-bold text-ink" dir="ltr">{totals.coins}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <span>إجمالي الربح</span>
              <span className="num font-bold text-ink" dir="ltr">
                {formatMinor(totals.margin, "USD")} USDT
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-line/60 pt-4">
            <p className="card-kicker">التوقعات</p>
            <p className="card-desc mt-1">المستوى المتوقع / الربح المتوقع</p>

            {clientProjections.length === 0 ? (
              <p className="empty mt-3">مفيش عملاء عندهم نشاط لسه.</p>
            ) : (
              <div className="mt-3 max-h-72 overflow-x-auto overflow-y-auto rounded-2xl border border-line">
                <table className="table">
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>العملات (٣٠ يوم)</th>
                      <th>markup الحالي</th>
                      <th>المستوى المتوقع (٧)</th>
                      <th>المستوى المتوقع (٣٠)</th>
                      <th>الربح المتوقع (٧)</th>
                      <th>الربح المتوقع (٣٠)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientProjections.map((p) => (
                      <tr key={p.clientId}>
                        <td>
                          <p className="font-semibold text-ink">{p.email ?? "عميل ضيف"}</p>
                          <p className="num text-xs text-muted">{p.clientId.slice(0, 8)}</p>
                        </td>
                        <td>
                          <span className="num font-bold text-ink" dir="ltr">{p.coinsConsumed30d}</span>
                        </td>
                        <td>
                          <span className="num text-ink" dir="ltr">{formatBps(p.markupBasisPoints)}</span>
                        </td>
                        <td>
                          <span className="num text-ink" dir="ltr">{formatBps(p.expectedMarkupBasisPoints7d)}</span>
                        </td>
                        <td>
                          <span className="num text-ink" dir="ltr">{formatBps(p.expectedMarkupBasisPoints30d)}</span>
                        </td>
                        <td>
                          <span className="num font-bold text-ink" dir="ltr">
                            {formatMinor(p.expectedProfit7Minor, "USD")} USDT
                          </span>
                        </td>
                        <td>
                          <span className="num font-bold text-ink" dir="ltr">
                            {formatMinor(p.expectedProfit30Minor, "USD")} USDT
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}
