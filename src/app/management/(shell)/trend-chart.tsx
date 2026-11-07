"use client"
/**
 * Renders a single-domain trend chart (live-cost/WAC/profit) over a fixed
 * 30-day window controlled by an external offset.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import {
  areaPath,
  barRects,
  bufferViewport,
  buildLiveGrid,
  CHART_PLOT_WIDTH,
  dayTicks,
  paddedExtent,
  scaleX,
  scaleY,
  sliceDayWindow,
  smoothPath,
  yAxisTicks,
  type ChartBox,
  type ChartPoint,
} from "./trend-chart-geometry"

type P2pPoint = {
  readonly day: string
  readonly hour?: string | number | null
  readonly egpPerUsdtMinor: number
  readonly minEgpPerUsdtMinor?: number
  readonly avgEgpPerUsdtMinor?: number
  readonly maxEgpPerUsdtMinor?: number
}

export type TrendChartProps = {
  readonly p2p: readonly P2pPoint[]
  readonly wac: readonly { readonly day: string; readonly wacEgpMinor: number }[]
  readonly profit: readonly { readonly day: string; readonly marginUsdMinor: number }[] // ascending, gap-filled daily
  readonly loading?: boolean
  readonly windowOffsetDays: number
  readonly maxWindowOffsetDays: number
  readonly onWindowOffsetChange?: (offset: number) => void
  /** First day (YYYY-MM-DD) of the window; independent of per-domain data. */
  readonly windowStartDay?: string
  /** Window width in days (7, 14, or 30). Defaults to 30. */
  readonly windowDays?: number
  readonly currentP2pMinor?: number | null
  readonly domain?: Domain
  readonly profitMode?: ProfitMode
}
export type ProfitMode = "daily" | "cumulative"
export type Domain = "live-cost" | "wac" | "profit"
type LiveSeries = "min" | "avg" | "max"

export const DOMAIN_OPTIONS: readonly { readonly value: Domain; readonly label: string }[] = [
  { value: "live-cost", label: "تكلفة USDT الحية" },
  { value: "wac", label: "USDT WAC" },
  { value: "profit", label: "الربح" },
]

const LIVE_SERIES_OPTIONS: readonly {
  readonly key: LiveSeries
  readonly label: string
  readonly color: string
  readonly hideLabel: string
  readonly showLabel: string
}[] = [
  {
    key: "max",
    label: "الحد الأعلى",
    color: "hsl(var(--jade))",
    hideLabel: "إخفاء الحد الأعلى",
    showLabel: "إظهار الحد الأعلى",
  },
  {
    key: "avg",
    label: "المتوسط",
    color: "hsl(var(--ember))",
    hideLabel: "إخفاء المتوسط",
    showLabel: "إظهار المتوسط",
  },
  {
    key: "min",
    label: "الحد الأدنى",
    color: "hsl(var(--sky))",
    hideLabel: "إخفاء الحد الأدنى",
    showLabel: "إظهار الحد الأدنى",
  },
]

const DEFAULT_WINDOW_DAYS = 30
const SLOTS_PER_DAY = 8
const BUFFER_WINDOWS = 3
const POINT_RADIUS = 1.5
const CHART_TEXT_SIZE = 11

const VB_W = 720
const VB_H = 340
const PAD = { top: 22, right: 18, bottom: 36, left: 74 }

const PLOT_BOX: ChartBox = {
  width: VB_W,
  height: VB_H,
  padding: { top: PAD.top, right: PAD.right, bottom: PAD.bottom, left: PAD.left },
}

function formatEgpTick(minor: number): string {
  return (minor / 100).toFixed(2)
}

function formatUsdMinor(minor: number): string {
  return (minor / 100).toFixed(2)
}

function formatTick(minor: number, domain: Domain): string {
  return domain === "profit" ? formatUsdMinor(minor) : formatEgpTick(minor)
}

type Aligned = {
  readonly day: string
  readonly label: string
  readonly liveMin: number | null
  readonly liveAvg: number | null
  readonly liveMax: number | null
  readonly wac: number | null
  readonly profit: number
  readonly cumulative: number
}

type LiveRow = {
  readonly day: string
  readonly hour: number
  readonly label: string
  readonly liveMin: number | null
  readonly liveAvg: number | null
  readonly liveMax: number | null
  readonly wac: number | null
  readonly profit: number
  readonly cumulative: number
}

function formatLiveLabel(day: string, hour: number): string {
  const mmdd = day.slice(5)
  const hh = String(hour).padStart(2, "0")
  return `${mmdd} ${hh}:00`
}

function buildWindowWac(
  profitWindow: readonly { readonly day: string }[],
  wac: readonly { readonly day: string; readonly wacEgpMinor: number }[],
): (number | null)[] {
  if (profitWindow.length === 0) return []
  const windowEnd = profitWindow[profitWindow.length - 1]!.day
  const firstDay = profitWindow[0]!.day
  const wacMap = new Map<string, number>()
  let lastWac: number | null = null
  let best: string | null = null
  for (const w of wac) {
    if (w.day <= windowEnd) wacMap.set(w.day, w.wacEgpMinor)
    if (w.day <= firstDay && (best === null || w.day > best)) best = w.day
  }
  if (best !== null) lastWac = wacMap.get(best) ?? null
  return profitWindow.map((row) => {
    if (wacMap.has(row.day)) lastWac = wacMap.get(row.day)!
    return lastWac
  })
}

function buildAligned(
  profit: readonly { readonly day: string; readonly marginUsdMinor: number }[],
  wacValues: readonly (number | null)[],
): Aligned[] {
  let cum = 0
  return profit.map((d, i) => {
    cum += d.marginUsdMinor
    return {
      day: d.day,
      label: d.day.slice(5),
      liveMin: null,
      liveAvg: null,
      liveMax: null,
      wac: wacValues[i] ?? null,
      profit: d.marginUsdMinor,
      cumulative: cum,
    }
  })
}



function hasLive(rows: readonly LiveRow[]): boolean {
  return rows.some((d) => d.liveAvg != null || d.liveMin != null || d.liveMax != null)
}

function hasWAC(rows: readonly Aligned[]): boolean {
  return rows.some((d) => d.wac != null)
}

function domainLabel(domain: Domain): string {
  if (domain === "live-cost") return "تكلفة USDT الحية"
  if (domain === "wac") return "USDT WAC"
  return "الربح"
}

function clampOffset(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)))
}

export default function TrendChart({
  p2p,
  wac,
  profit,
  loading = false,
  windowOffsetDays,
  maxWindowOffsetDays,
  onWindowOffsetChange,
  windowStartDay,
  windowDays = DEFAULT_WINDOW_DAYS,
  currentP2pMinor = null,
  domain = "live-cost",
  profitMode = "daily",
}: TrendChartProps) {
  const [hiddenLive, setHiddenLive] = useState<ReadonlySet<LiveSeries>>(new Set())
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const bufferRef = useRef<SVGGElement>(null)
  const axisRef = useRef<SVGGElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startClientX: number
    startTx: number
    baseTx: number
    minTx: number
    maxTx: number
    tx: number
    moved: boolean
  } | null>(null)

  function toggleLiveSeries(key: LiveSeries) {
    setHiddenLive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    setHoverIndex(null)
  }, [windowOffsetDays])

  const windowProfit = useMemo(
    () => sliceDayWindow(profit, windowOffsetDays, windowDays),
    [profit, windowOffsetDays, windowDays],
  )
  const windowWacValues = useMemo(() => buildWindowWac(windowProfit, wac), [windowProfit, wac])
  const alignedDaily = useMemo(
    () => buildAligned(windowProfit, windowWacValues),
    [windowProfit, windowWacValues],
  )

  const bufferOffset = Math.max(0, windowOffsetDays - windowDays)
  const bufferProfit = useMemo(
    () => sliceDayWindow(profit, bufferOffset, windowDays * BUFFER_WINDOWS),
    [profit, bufferOffset, windowDays],
  )
  const bufferDays = bufferProfit.length
  const bufferStartDay = bufferProfit[0]?.day ?? windowProfit[0]?.day ?? ""
  const useBuffer = bufferDays > 0

  const bufferWacValues = useMemo(
    () => (useBuffer ? buildWindowWac(bufferProfit, wac) : []),
    [useBuffer, bufferProfit, wac],
  )
  const bufferAlignedDaily = useMemo(
    () => (useBuffer ? buildAligned(bufferProfit, bufferWacValues) : []),
    [useBuffer, bufferProfit, bufferWacValues],
  )

  // Calendar window is independent of per-domain data (profit may be empty).
  const axisStartDay = windowStartDay ?? windowProfit[0]?.day ?? ""
  const windowStartMs = useMemo(
    () => (axisStartDay ? Date.parse(`${axisStartDay}T00:00:00.000Z`) : NaN),
    [axisStartDay],
  )
  const hasWindowAnchor = Number.isFinite(windowStartMs)

  const bufferStartMs = useMemo(
    () => (bufferStartDay ? Date.parse(`${bufferStartDay}T00:00:00.000Z`) : NaN),
    [bufferStartDay],
  )

  const liveObservationCount = useMemo(() => {
    if (!hasWindowAnchor) return 0
    const windowEndMs = windowStartMs + windowDays * 24 * 60 * 60 * 1000
    let n = 0
    for (const p of p2p) {
      const h = p.hour
      let ts: number
      if (h != null && typeof h === "string" && h.includes("T")) {
        ts = Date.parse(h)
      } else if (h != null && typeof h === "number" && Number.isFinite(h)) {
        ts = Date.parse(`${p.day}T${String(Math.trunc(h)).padStart(2, "0")}:00:00.000Z`)
      } else {
        ts = Date.parse(`${p.day}T23:59:59.999Z`)
      }
      if (Number.isFinite(ts) && ts >= windowStartMs && ts < windowEndMs) n++
    }
    return n
  }, [hasWindowAnchor, windowStartMs, windowDays, p2p])

  const mapLiveGrid = (grid: ReturnType<typeof buildLiveGrid>, hasExplicitMinMax: boolean): LiveRow[] =>
    grid.map((slot) => ({
      day: slot.day,
      hour: slot.hour,
      label: formatLiveLabel(slot.day, slot.hour),
      liveMin: hasExplicitMinMax && slot.liveMin != null ? Math.round(slot.liveMin * 100) : null,
      liveAvg: slot.liveAvg != null ? Math.round(slot.liveAvg * 100) : null,
      liveMax: hasExplicitMinMax && slot.liveMax != null ? Math.round(slot.liveMax * 100) : null,
      wac: null,
      profit: 0,
      cumulative: 0,
    }))

  const liveRows = useMemo(() => {
    if (!hasWindowAnchor) return [] as LiveRow[]
    const hasExplicitMinMax = p2p.some(
      (p) => p.minEgpPerUsdtMinor != null || p.maxEgpPerUsdtMinor != null,
    )
    return mapLiveGrid(buildLiveGrid(p2p, windowStartMs, windowDays), hasExplicitMinMax)
  }, [hasWindowAnchor, windowStartMs, windowDays, p2p])

  const bufferLiveRows = useMemo(() => {
    if (!useBuffer || !Number.isFinite(bufferStartMs)) return [] as LiveRow[]
    const hasExplicitMinMax = p2p.some(
      (p) => p.minEgpPerUsdtMinor != null || p.maxEgpPerUsdtMinor != null,
    )
    return mapLiveGrid(buildLiveGrid(p2p, bufferStartMs, bufferDays), hasExplicitMinMax)
  }, [useBuffer, bufferStartMs, bufferDays, p2p])

  const isLive = domain === "live-cost"
  const showLiveMin = !hiddenLive.has("min")
  const showLiveAvg = !hiddenLive.has("avg")
  const showLiveMax = !hiddenLive.has("max")

  const renderAligned = useBuffer ? bufferAlignedDaily : alignedDaily
  const renderLive = useBuffer ? bufferLiveRows : liveRows
  const renderCount = isLive ? renderLive.length : renderAligned.length
  const activeEmpty = isLive
    ? !hasLive(liveRows)
    : domain === "wac"
      ? !hasWAC(alignedDaily)
      : alignedDaily.length === 0

  const legend =
    domain === "live-cost" ? (
      <div
        className="flex flex-wrap items-center gap-4 text-sm muted"
        data-testid="live-cost-legend"
      >
        {LIVE_SERIES_OPTIONS.map((opt) => {
          const visible = !hiddenLive.has(opt.key)
          return (
            <button
              key={opt.key}
              type="button"
              className="flex items-center gap-1.5"
              data-testid={`live-cost-legend-live-${opt.key}`}
              aria-pressed={visible}
              aria-label={visible ? opt.hideLabel : opt.showLabel}
              title={visible ? opt.hideLabel : opt.showLabel}
              onClick={() => toggleLiveSeries(opt.key)}
              style={{
                opacity: visible ? 1 : 0.4,
                background: "none",
                border: "none",
                padding: 0,
                color: "inherit",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 3,
                  backgroundColor: opt.color,
                  display: "inline-block",
                  borderRadius: 2,
                }}
              />
              {opt.label}
            </button>
          )
        })}
      </div>
    ) : null

  // Full placeholder only when loading or there is no valid calendar window.
  if (loading || !hasWindowAnchor) {
    return (
      <article className="chart-card" data-domain={domain}>
        <div className="card-body">
          {legend}
          {loading ? (
            <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
              <div className="skeleton" style={{ height: 180, width: "100%" }} />
            </div>
          ) : (
            <div
              aria-disabled="true"
              className="mt-4 flex items-center justify-center rounded-xl border border-line bg-raised p-6 text-center"
              style={{ height: VB_H, opacity: 0.5 }}
            >
              <p className="muted text-sm">مفيش بيانات كافية للمجال ده.</p>
            </div>
          )}
        </div>
      </article>
    )
  }

  const box = PLOT_BOX
  const slotsPerDay = isLive ? SLOTS_PER_DAY : 1
  const count = isLive ? windowDays * SLOTS_PER_DAY : windowDays
  const axisTicks = dayTicks(axisStartDay, windowDays)
  const plotWidth = VB_W - PAD.left - PAD.right
  const plotHeight = VB_H - PAD.top - PAD.bottom

  const profitValues = renderAligned.map((d) => (profitMode === "daily" ? d.profit : d.cumulative))

  let yMin = 0
  let yMax = 1
  if (domain === "profit") {
    const ex = paddedExtent(profitValues)
    yMin = ex ? ex.min : 0
    yMax = ex ? ex.max : 1
  } else if (domain === "live-cost") {
    const vals: (number | null)[] = []
    for (const d of renderLive) {
      if (showLiveMin) vals.push(d.liveMin)
      if (showLiveAvg) vals.push(d.liveAvg)
      if (showLiveMax) vals.push(d.liveMax)
    }
    if (currentP2pMinor != null && !activeEmpty) vals.push(currentP2pMinor)
    const ex = paddedExtent(vals)
    yMin = ex?.min ?? 0
    yMax = ex?.max ?? 1
  } else {
    const vals: (number | null)[] = renderAligned.map((d) => d.wac)
    const ex = paddedExtent(vals)
    yMin = ex?.min ?? 0
    yMax = ex?.max ?? 1
  }

  const yTicks = yAxisTicks(yMin, yMax, 6)
  const axisLabel = domain === "profit" ? "USDT" : "ج.م/USDT"

  const vp = useBuffer
    ? bufferViewport({
        windowDays,
        windowOffsetDays,
        bufferDays,
        bufferCount: renderCount,
        visibleCount: count,
        slotsPerDay,
        plotLeft: PAD.left,
        plotWidth,
      })
    : null
  const bufferX = (i: number): number =>
    vp ? vp.bufferLeft + (i / Math.max(1, renderCount)) * vp.bufferSpan : scaleX(i, count, box)
  const renderStartIndex = useBuffer
    ? Math.max(0, (bufferDays - (windowOffsetDays - bufferOffset) - windowDays) * slotsPerDay)
    : 0

  const liveMinPoints: ChartPoint[] = []
  const liveAvgPoints: ChartPoint[] = []
  const liveMaxPoints: ChartPoint[] = []
  const wacPoints: ChartPoint[] = []
  if (domain === "live-cost") {
    for (let i = 0; i < renderLive.length; i++) {
      const d = renderLive[i]!
      if (showLiveMin && d.liveMin != null) liveMinPoints.push({ x: bufferX(i), y: scaleY(d.liveMin, yMin, yMax, box) })
      if (showLiveAvg && d.liveAvg != null) liveAvgPoints.push({ x: bufferX(i), y: scaleY(d.liveAvg, yMin, yMax, box) })
      if (showLiveMax && d.liveMax != null) liveMaxPoints.push({ x: bufferX(i), y: scaleY(d.liveMax, yMin, yMax, box) })
    }
  }
  if (domain === "wac") {
    for (let i = 0; i < renderAligned.length; i++) {
      const v = renderAligned[i]!.wac
      if (v != null) wacPoints.push({ x: bufferX(i), y: scaleY(v, yMin, yMax, box) })
    }
  }
  const pfBaseY = scaleY(0, yMin, yMax, box)
  const barBox: ChartBox = vp
    ? { width: PAD.left + vp.bufferSpan + PAD.right, height: VB_H, padding: PAD }
    : box
  const bars = domain === "profit" && profitMode === "daily" ? barRects(profitValues, yMax, barBox) : []
  const cumPoints: ChartPoint[] =
    domain === "profit" && profitMode === "cumulative"
      ? renderAligned.map((_, i) => ({
          x: bufferX(i),
          y: scaleY(profitValues[i]!, yMin, yMax, box),
        }))
      : []

  const has3Hour = domain === "live-cost"
  const windowStart = axisStartDay || "—"
  const windowEndMs = hasWindowAnchor ? windowStartMs + (windowDays - 1) * 24 * 60 * 60 * 1000 : NaN
  const windowEnd = Number.isFinite(windowEndMs) ? new Date(windowEndMs).toISOString().slice(0, 10) : "—"
  const ariaLabel = `مخطط الاتجاه: ${domainLabel(domain)}${domain === "profit" ? ` (${profitMode === "daily" ? "يومي" : "تراكمي"})` : ""}، من ${windowStart} إلى ${windowEnd} خلال نافذة ${windowDays} يوم${has3Hour ? " بنقاط كل 3 ساعات" : ""}. استخدم مفاتيح الأسهم لتحريك النافذة.`

  function hoverIndexFromClientX(svg: SVGSVGElement, clientX: number): number | null {
    const hoverCount = isLive ? liveRows.length : alignedDaily.length
    if (hoverCount <= 0) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return null
    const relX = ((clientX - rect.left) / rect.width) * VB_W
    const left = PAD.left
    const right = VB_W - PAD.right
    if (relX < left || relX > right) return null
    const t = (relX - left) / Math.max(1, right - left)
    const idx = Math.round(t * (hoverCount - 1))
    return Math.max(0, Math.min(hoverCount - 1, idx))
  }

  function indexFromPointer(e: PointerEvent<SVGSVGElement>): number | null {
    return hoverIndexFromClientX(e.currentTarget, e.clientX)
  }

  function viewBoxDx(svg: SVGSVGElement, dxClient: number): number {
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return (dxClient / rect.width) * VB_W
  }

  function maybeChangeOffset(next: number) {
    const clamped = clampOffset(next, maxWindowOffsetDays)
    if (clamped !== windowOffsetDays) onWindowOffsetChange?.(clamped)
  }

  function dragBounds() {
    const plotWidth = VB_W - PAD.left - PAD.right
    const dayWidth = plotWidth / windowDays
    const visibleCount = count
    const bufferCount = renderCount
    const bufferDaysCount = useBuffer ? bufferDays : windowDays
    const bufferStartX =
      vp != null ? vp.bufferLeft : scaleX(0, Math.max(1, bufferCount), box)
    const bufferSpan =
      vp != null ? vp.bufferSpan : (bufferDaysCount / windowDays) * plotWidth
    const bufferX = (i: number): number =>
      bufferStartX + (i / Math.max(1, bufferCount)) * bufferSpan
    const txNewest = PAD.left - bufferX(Math.max(0, bufferCount - visibleCount))
    const txOldest = PAD.left - bufferX(0)
    const minTx = Math.min(txNewest, txOldest)
    const maxTx = Math.max(txNewest, txOldest)
    return { plotWidth, dayWidth, minTx, maxTx }
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    e.currentTarget.focus?.()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const baseTx = vp ? vp.tx : 0
    const { minTx, maxTx } = dragBounds()
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startTx: baseTx,
      baseTx,
      minTx,
      maxTx,
      tx: baseTx,
      moved: false,
    }
    setDragging(true)
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) {
      if (!dragging) setHoverIndex(indexFromPointer(e))
      return
    }
    const dxViewBox = viewBoxDx(e.currentTarget, e.clientX - drag.startClientX)
    if (!drag.moved && Math.abs(dxViewBox) < 5) return
    if (!drag.moved) {
      drag.moved = true
      setHoverIndex(null)
    }
    const nextTx = Math.max(drag.minTx, Math.min(drag.maxTx, drag.startTx + dxViewBox))
    drag.tx = nextTx
    bufferRef.current?.setAttribute("transform", `translate(${nextTx}, 0)`)
    axisRef.current?.setAttribute("transform", `translate(${nextTx - drag.baseTx}, 0)`)
  }

  function endPointer(e: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const wasTap = !drag.moved
    const { dayWidth } = dragBounds()
    const finalTx = drag.tx
    const baseTx = drag.baseTx
    dragRef.current = null
    setDragging(false)
    if (wasTap) {
      setHoverIndex(hoverIndexFromClientX(e.currentTarget, e.clientX))
      return
    }
    const dayDelta = Math.round((finalTx - baseTx) / dayWidth)
    const nextOffset = clampOffset(windowOffsetDays + dayDelta, maxWindowOffsetDays)
    if (nextOffset !== windowOffsetDays) {
      onWindowOffsetChange?.(nextOffset)
    } else {
      bufferRef.current?.setAttribute("transform", `translate(${baseTx}, 0)`)
      axisRef.current?.setAttribute("transform", "translate(0, 0)")
    }
  }

  function handleKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    let next: number | null = null
    const step = e.shiftKey ? 7 : 1
    if (e.key === "ArrowLeft") next = windowOffsetDays + step
    else if (e.key === "ArrowRight") next = windowOffsetDays - step
    else if (e.key === "Home") next = maxWindowOffsetDays
    else if (e.key === "End") next = 0
    if (next == null) return
    e.preventDefault()
    maybeChangeOffset(next)
  }

  const hoverCount = isLive ? liveRows.length : alignedDaily.length
  const hover =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < hoverCount
      ? isLive
        ? liveRows[hoverIndex]
        : alignedDaily[hoverIndex]
      : null
  const hoverX = hoverIndex != null ? scaleX(hoverIndex, hoverCount, box) : 0

  return (
    <article className="chart-card" data-domain={domain}>
      <div className="card-body">
        {legend}

        <svg
          className={`chart-svg${dragging ? " chart-svg-dragging" : ""}`}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ direction: "ltr" }}
          role="img"
          aria-label={ariaLabel}
          data-domain={domain}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={() => {
            if (!dragging) setHoverIndex(null)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setHoverIndex(hoverCount > 0 ? hoverCount - 1 : null)}
          onBlur={() => setHoverIndex(null)}
        >
          <defs>
            <clipPath id="trend-plot-clip">
              <rect x={PAD.left} y={PAD.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>
          <text x={PAD.left} y={16} fontSize={CHART_TEXT_SIZE} fontWeight={500} fill="hsl(var(--muted))">
            {axisLabel}
          </text>
          {yTicks.map((t) => {
            const y = scaleY(t, yMin, yMax, box)
            return (
              <g key={`tick-${t}`}>
                <line x1={PAD.left} y1={y} x2={VB_W - PAD.right} y2={y} stroke="hsl(var(--line))" strokeWidth={1} />
                <text x={PAD.left - 6} y={y + 5} fontSize={CHART_TEXT_SIZE} fontWeight={500} fill="hsl(var(--muted))" textAnchor="end">
                  {formatTick(t, domain)}
                </text>
              </g>
            )
          })}

          <g ref={axisRef} data-testid="trend-axis">
            {axisTicks.map((tick) => {
              const x = scaleX(tick.index * slotsPerDay, count, box)
              return (
                <g key={`day-${tick.index}`}>
                  <line
                    data-series="day-grid"
                    x1={x}
                    y1={PAD.top}
                    x2={x}
                    y2={VB_H - PAD.bottom}
                    stroke="hsl(var(--line))"
                    strokeWidth={1}
                    opacity={0.35}
                  />
                  {tick.label != null ? (
                    <text
                      x={x}
                      y={VB_H - 10}
                      fontSize={CHART_TEXT_SIZE}
                      fontWeight={500}
                      fill="hsl(var(--muted))"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>

            <g clipPath="url(#trend-plot-clip)">
              <g ref={bufferRef} data-testid="trend-buffer" transform={`translate(${vp ? vp.tx : 0}, 0)`}>
              {!activeEmpty && domain === "live-cost" && liveMinPoints.length > 0 ? (
                <path data-series="live-min" d={smoothPath(liveMinPoints)} fill="none" stroke="hsl(var(--sky))" strokeWidth={1.8} />
              ) : null}
              {!activeEmpty && domain === "live-cost" && liveAvgPoints.length > 0 ? (
                <path data-series="live-avg" d={smoothPath(liveAvgPoints)} fill="none" stroke="hsl(var(--ember))" strokeWidth={2} />
              ) : null}
              {!activeEmpty && domain === "live-cost" && liveMaxPoints.length > 0 ? (
                <path data-series="live-max" d={smoothPath(liveMaxPoints)} fill="none" stroke="hsl(var(--jade))" strokeWidth={1.8} />
              ) : null}
              {!activeEmpty && domain === "wac" && wacPoints.length > 0 ? (
                <path data-series="wac" d={smoothPath(wacPoints)} fill="none" stroke="hsl(var(--sky))" strokeWidth={1.8} />
              ) : null}

              {!activeEmpty && domain === "live-cost"
                ? renderLive.map((d, i) => {
                    if (!showLiveMin || d.liveMin == null) return null
                    return <circle key={`min-dot-${i}`} data-series="live-min-point" cx={bufferX(i)} cy={scaleY(d.liveMin, yMin, yMax, box)} r={POINT_RADIUS} fill="hsl(var(--sky))" />
                  })
                : null}
              {!activeEmpty && domain === "live-cost"
                ? renderLive.map((d, i) => {
                    if (!showLiveAvg || d.liveAvg == null) return null
                    return <circle key={`avg-dot-${i}`} data-series="live-avg-point" cx={bufferX(i)} cy={scaleY(d.liveAvg, yMin, yMax, box)} r={POINT_RADIUS} fill="hsl(var(--ember))" />
                  })
                : null}
              {!activeEmpty && domain === "live-cost"
                ? renderLive.map((d, i) => {
                    if (!showLiveMax || d.liveMax == null) return null
                    return <circle key={`max-dot-${i}`} data-series="live-max-point" cx={bufferX(i)} cy={scaleY(d.liveMax, yMin, yMax, box)} r={POINT_RADIUS} fill="hsl(var(--jade))" />
                  })
                : null}
              {!activeEmpty && domain === "wac"
                ? renderAligned.map((d, i) => {
                    if (d.wac == null) return null
                    return <circle key={`wac-dot-${i}`} data-series="wac-point" cx={bufferX(i)} cy={scaleY(d.wac, yMin, yMax, box)} r={POINT_RADIUS} fill="hsl(var(--sky))" />
                  })
                : null}

              {!activeEmpty && domain === "profit" && profitMode === "daily"
                ? bars.map((b, i) => (
                    <rect
                      key={`bar-${i}`}
                      data-series="profit-bars"
                      x={b.x}
                      y={b.y}
                      width={b.width}
                      height={b.height}
                      fill="hsl(var(--jade))"
                      opacity={0.85}
                      rx={1}
                    />
                  ))
                : null}
              {!activeEmpty && domain === "profit" && profitMode === "cumulative" && cumPoints.length > 0 ? (
                <path
                  data-series="profit-area"
                  d={areaPath(cumPoints, pfBaseY)}
                  fill="hsl(var(--gold))"
                  opacity={0.28}
                  stroke="hsl(var(--gold))"
                  strokeWidth={1.5}
                />
              ) : null}
            </g>
          </g>

          {!activeEmpty && domain === "live-cost" && currentP2pMinor != null ? (
            <g data-series="live-current">
              {(() => {
                const y = scaleY(currentP2pMinor, yMin, yMax, box)
                const label = `الحالي ${formatEgpTick(currentP2pMinor)} ج.م`
                return (
                  <>
                    <line
                      x1={PAD.left}
                      y1={y}
                      x2={VB_W - PAD.right}
                      y2={y}
                      stroke="hsl(var(--ember))"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      opacity={0.9}
                    />
                    <text
                      x={VB_W - PAD.right - 4}
                      y={y - 4}
                      fontSize={CHART_TEXT_SIZE}
                      fontWeight={500}
                      fill="hsl(var(--ember))"
                      textAnchor="end"
                    >
                      {label}
                    </text>
                  </>
                )
              })()}
            </g>
          ) : null}

          {activeEmpty ? (
            <text
              data-testid="empty-domain-note"
              x={VB_W / 2}
              y={PAD.top + (VB_H - PAD.top - PAD.bottom) / 2}
              fontSize={CHART_TEXT_SIZE}
              fontWeight={500}
              fill="hsl(var(--muted))"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={0.8}
            >
              مفيش بيانات كافية للمجال ده.
            </text>
          ) : null}

          {!activeEmpty && hover ? (
            <g>
              <line x1={hoverX} y1={PAD.top} x2={hoverX} y2={VB_H - PAD.bottom} stroke="hsl(var(--muted))" strokeWidth={1} opacity={0.6} />
              {(() => {
                const lines: string[] = [hover.label]
                if (domain === "live-cost") {
                  if (showLiveMin && hover.liveMin != null) lines.push(`الحد الأدنى: ${formatEgpTick(hover.liveMin)} ج.م`)
                  if (showLiveAvg && hover.liveAvg != null) lines.push(`المتوسط: ${formatEgpTick(hover.liveAvg)} ج.م`)
                  if (showLiveMax && hover.liveMax != null) lines.push(`الحد الأعلى: ${formatEgpTick(hover.liveMax)} ج.م`)
                }
                if (domain === "wac") {
                  if (hover.wac != null) lines.push(`WAC: ${formatEgpTick(hover.wac)} ج.م`)
                }
                if (domain === "profit") {
                  lines.push(`الربح: ${formatUsdMinor(profitMode === "daily" ? hover.profit : hover.cumulative)} USDT`)
                }
                const tw = 220
                const th = 16 + lines.length * 17
                let tx = hoverX + 8
                if (tx + tw > VB_W - 4) tx = hoverX - tw - 8
                const ty = PAD.top + 4
                return (
                  <g>
                    <rect x={tx} y={ty} width={tw} height={th} rx={6} fill="hsl(var(--surface))" stroke="hsl(var(--line))" />
                    {lines.map((l, i) => (
                      <text
                        key={i}
                        x={tx + 8}
                        y={ty + 16 + i * 17}
                        fontSize={CHART_TEXT_SIZE}
                        fontWeight={i === 0 ? 700 : undefined}
                        fill={i === 0 ? "hsl(var(--ink))" : "hsl(var(--muted))"}
                      >
                        {l}
                      </text>
                    ))}
                  </g>
                )
              })()}
            </g>
          ) : null}
        </svg>
      </div>
    </article>
  )
}
