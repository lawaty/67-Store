/**
 * Pure SVG chart scaling and geometry utilities with no React dependencies.
 */
export type ChartPoint = { readonly x: number; readonly y: number }

/** Plot width for the 720-wide chart viewBox (720 - 74 left - 18 right). */
export const CHART_PLOT_WIDTH = 720 - 74 - 18

export type AxisTick = { readonly index: number; readonly label: string | null }

export type ChartBox = {
  readonly width: number
  readonly height: number
  readonly padding: {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
  }
}

export type ChartTick = { readonly value: number; readonly y: number }

export type ChartBar = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Flat-line fallback pad (1 major unit in minor units); normal padding is proportional (range / 6). */
export const Y_AXIS_PADDING_MINOR = 100

export function paddedExtent(
  values: readonly (number | null | undefined)[],
  padOverride?: number,
): { min: number; max: number } | null {
  let minValue = Infinity
  let maxValue = -Infinity
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue
    if (v < minValue) minValue = v
    if (v > maxValue) maxValue = v
  }
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return null
  const pad =
    padOverride != null
      ? padOverride
      : maxValue === minValue
        ? Y_AXIS_PADDING_MINOR
        : (maxValue - minValue) / 6
  return { min: minValue - pad, max: maxValue + pad }
}

export type P2pPriceLike = {
  readonly day: string
  readonly hour?: number | string | null
  readonly egpPerUsdtMinor: number
  readonly minEgpPerUsdtMinor?: number | null
  readonly avgEgpPerUsdtMinor?: number | null
  readonly maxEgpPerUsdtMinor?: number | null
}

export type LiveGridPoint = {
  readonly t: number // UTC ms at slot start
  readonly day: string // YYYY-MM-DD (UTC)
  readonly hour: number // UTC hour at slot start (0,3,6,...,21)
  readonly liveMin?: number // EGP major
  readonly liveAvg?: number
  readonly liveMax?: number
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0
}

export function plotWidth(box: ChartBox): number {
  return Math.max(0, finite(box.width) - finite(box.padding.left) - finite(box.padding.right))
}

export function plotHeight(box: ChartBox): number {
  return Math.max(0, finite(box.height) - finite(box.padding.top) - finite(box.padding.bottom))
}

export function scaleX(index: number, count: number, box: ChartBox): number {
  const left = finite(box.padding.left)
  const w = plotWidth(box)
  if (count <= 1) return left
  const c = finite(count)
  if (c <= 1) return left
  const i = finite(index)
  return left + (i / c) * w
}

export function scaleY(value: number, min: number, max: number, box: ChartBox): number {
  const top = finite(box.padding.top)
  const h = plotHeight(box)
  const v = finite(value)
  const lo = finite(min)
  const hi = finite(max)
  if (hi === lo) return top + h / 2
  const t = (v - lo) / (hi - lo)
  return top + (1 - t) * h
}

export function niceTicks(min: number, max: number, count: number): readonly number[] {
  const lo = finite(min)
  const hi = finite(max)
  const target = Math.max(2, Math.floor(finite(count)))
  if (hi === lo) {
    if (lo === 0) return [-1, 0, 1]
    const step = niceStep(Math.abs(lo), target)
    const start = Math.floor(lo / step) * step
    const ticks: number[] = []
    for (let v = start; v <= lo + step * 0.5 && ticks.length < target + 2; v += step) {
      ticks.push(roundTick(v, step))
      if (ticks.length >= 3 && ticks[0]! <= lo && ticks[ticks.length - 1]! >= lo) break
    }
    if (ticks.length === 0 || !ticks.some((t) => Math.abs(t - lo) < step * 0.001)) {
      return [roundTick(lo - step, step), roundTick(lo, step), roundTick(lo + step, step)]
    }
    return ticks.slice(0, target)
  }
  const low = Math.min(lo, hi)
  const high = Math.max(lo, hi)
  const span = high - low
  const step = niceStep(span, target)
  const start = Math.floor(low / step) * step
  const end = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step * 0.5; v += step) {
    ticks.push(roundTick(v, step))
    if (ticks.length > target * 4) break
  }
  let result = ticks.filter((v) => v >= start - step * 0.001 && v <= end + step * 0.001)
  if (result.length === 0) result = [roundTick(start, step), roundTick(end, step)]
  if (result.length > target) {
    const picked: number[] = [result[0]!]
    const stride = (result.length - 1) / (target - 1)
    for (let i = 1; i < target - 1; i++) {
      picked.push(result[Math.round(i * stride)]!)
    }
    picked.push(result[result.length - 1]!)
    result = [...new Set(picked)].sort((a, b) => a - b)
  }
  if (!result.some((v) => v <= low + step * 0.001)) result = [roundTick(start, step), ...result]
  if (!result.some((v) => v >= high - step * 0.001)) result = [...result, roundTick(end, step)]
  return result.slice(0, Math.max(target, result.length > target ? target : result.length))
}

function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target - 1)
  if (!Number.isFinite(raw) || raw <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const residual = raw / mag
  let nice = 1
  if (residual <= 1) nice = 1
  else if (residual <= 2) nice = 2
  else if (residual <= 5) nice = 5
  else nice = 10
  return nice * mag
}

function roundTick(v: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 6)
  const r = Number(v.toFixed(Math.min(decimals, 12)))
  return Object.is(r, -0) ? 0 : r
}

export function yAxisTicks(min: number, max: number, grades = 6): readonly number[] {
  const lo = finite(min)
  const hi = finite(max)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (hi < lo) return [lo]
  if (hi === lo) return [lo]

  const span = hi - lo
  const epsilon = span * 1e-9
  const crowd = span * 0.04
  const gradeCount = Math.max(1, Math.floor(finite(grades)))

  const interior = niceTicks(lo, hi, gradeCount).filter(
    (t) => t > lo + crowd && t < hi - crowd,
  )

  let ticks: number[]
  if (interior.length < 2) {
    ticks = [lo]
    for (let i = 1; i <= gradeCount; i++) {
      ticks.push(lo + (span * i) / (gradeCount + 1))
    }
    ticks.push(hi)
  } else {
    ticks = [lo, ...interior, hi]
  }

  const deduped: number[] = []
  for (const t of ticks.slice().sort((a, b) => a - b)) {
    if (deduped.length === 0 || Math.abs(t - deduped[deduped.length - 1]!) > epsilon) {
      deduped.push(t)
    }
  }

  if (deduped.length === 0 || Math.abs(deduped[0]! - lo) > epsilon) deduped.unshift(lo)
  if (Math.abs(deduped[deduped.length - 1]! - hi) > epsilon) deduped.push(hi)

  return deduped
}

function fmt(n: number): string {
  const v = finite(n)
  const r = Number(v.toFixed(6))
  return Object.is(r, -0) ? "0" : String(r)
}

export function linePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return ""
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${fmt(p.x)} ${fmt(p.y)}`).join(" ")
}

export function stepPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return ""
  const parts: string[] = [`M ${fmt(points[0]!.x)} ${fmt(points[0]!.y)}`]
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const cur = points[i]!
    parts.push(`L ${fmt(cur.x)} ${fmt(prev.y)}`)
    parts.push(`L ${fmt(cur.x)} ${fmt(cur.y)}`)
  }
  return parts.join(" ")
}

function smoothSegments(points: readonly ChartPoint[]): string {
  if (points.length < 2) return ""
  const segments: string[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    segments.push(`C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`)
  }
  return segments.join(" ")
}

export function smoothPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return ""
  if (points.length === 1) {
    const p = points[0]!
    return `M ${fmt(p.x)} ${fmt(p.y)}`
  }
  const first = points[0]!
  return `M ${fmt(first.x)} ${fmt(first.y)} ${smoothSegments(points)}`
}

export function areaPath(points: readonly ChartPoint[], baselineY: number): string {
  if (points.length === 0) return ""
  const base = fmt(finite(baselineY))
  const first = points[0]!
  const last = points[points.length - 1]!
  const segments = smoothSegments(points)
  const parts: string[] = [`M ${fmt(first.x)} ${base}`]
  if (points.length === 1) {
    parts.push(`L ${fmt(first.x)} ${fmt(first.y)}`)
  } else {
    parts.push(...segments.split(" "))
  }
  parts.push(`L ${fmt(last.x)} ${base}`)
  parts.push("Z")
  return parts.join(" ")
}

export function bandPath(top: readonly ChartPoint[], bottom: readonly ChartPoint[]): string {
  if (top.length === 0 || bottom.length === 0 || top.length !== bottom.length) return ""
  if (top.length === 1) {
    const t = top[0]!
    const b = bottom[0]!
    return `M ${fmt(t.x)} ${fmt(t.y)} L ${fmt(b.x)} ${fmt(b.y)} Z`
  }
  const topSegments = smoothSegments(top)
  const bottomSegments = smoothSegments([...bottom].reverse())
  const firstTop = top[0]!
  const lastBottom = bottom[bottom.length - 1]!
  return `M ${fmt(firstTop.x)} ${fmt(firstTop.y)} ${topSegments} L ${fmt(lastBottom.x)} ${fmt(lastBottom.y)} ${bottomSegments} Z`
}

export function barRects(values: readonly number[], max: number, box: ChartBox): ChartBar[] {
  if (values.length === 0) return []
  const left = finite(box.padding.left)
  const w = plotWidth(box)
  const top = finite(box.padding.top)
  const h = plotHeight(box)
  const baseline = top + h
  const hi = finite(max)
  const slot = w / values.length
  const gap = slot * 0.2
  const barW = Math.max(0, slot - gap)
  return values.map((value, i) => {
    const v = Math.max(0, finite(value))
    const ratio = hi > 0 ? Math.min(1, v / hi) : 0
    const barH = ratio * h
    return {
      x: left + i * slot + gap / 2,
      y: baseline - barH,
      width: barW,
      height: barH,
    }
  })
}

export function sliceDayWindow<T extends { day: string }>(
  points: readonly T[],
  offsetDays: number,
  windowDays = 30,
): readonly T[] {
  if (points.length === 0) return []
  const maxOffset = Math.max(0, points.length - windowDays)
  const offset = Math.min(Math.max(0, Math.trunc(offsetDays)), maxOffset)
  const end = points.length - offset
  const start = Math.max(0, end - windowDays)
  return points.slice(start, end)
}

function formatDayLabel(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  return `${mm}-${dd}`
}

export function dayTicks(startDay: string, windowDays = 30): readonly AxisTick[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay)) return []
  const start = new Date(`${startDay}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return []
  const days = Math.max(0, Math.floor(finite(windowDays)))
  if (days === 0) return []
  const dayWidth = CHART_PLOT_WIDTH / days
  const step = Math.max(1, Math.ceil(60 / dayWidth))
  const ticks: AxisTick[] = []
  for (let index = 0; index < days; index++) {
    const label = index % step === 0
      ? formatDayLabel(new Date(start.getTime() + index * 86400000))
      : null
    ticks.push({ index, label })
  }
  return ticks
}

const SLOT_MS = 3 * 3600_000

function parseDayUtc(day: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return { y, m: mo, d }
}

function hourNumber(hour: number | string | null | undefined): number | null {
  if (hour == null) return null
  if (typeof hour === "number") {
    return Number.isFinite(hour) ? Math.trunc(hour) : null
  }
  if (typeof hour === "string") {
    const asNum = Number(hour)
    if (Number.isFinite(asNum) && hour.trim() !== "" && /^-?\d+$/.test(hour.trim())) {
      return Math.trunc(asNum)
    }
    const t = Date.parse(hour)
    if (Number.isFinite(t)) return new Date(t).getUTCHours()
  }
  return null
}

function pointTimestampMs(p: P2pPriceLike): number {
  const d = parseDayUtc(p.day)
  if (!d) {
    const t = Date.parse(`${p.day}T23:59:59.999Z`)
    return Number.isFinite(t) ? t : 0
  }
  const h = hourNumber(p.hour)
  if (h !== null) return Date.UTC(d.y, d.m - 1, d.d, h)
  return Date.UTC(d.y, d.m - 1, d.d, 23, 59, 59, 999)
}

function toMajor(minor: number | null | undefined): number | undefined {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return undefined
  return minor / 100
}

export function buildLiveGrid(
  points: readonly P2pPriceLike[],
  windowStartMs: number,
  windowDays = 30,
): readonly LiveGridPoint[] {
  const days = Math.max(0, Math.floor(finite(windowDays)))
  const slotCount = days * 8
  const start = finite(windowStartMs)

  type SlotValues = { ts: number; order: number; min?: number; avg?: number; max?: number }
  const slots: Array<SlotValues | undefined> = Array.from({ length: slotCount })

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const ts = pointTimestampMs(p)
    const slotIndex = Math.floor((ts - start) / SLOT_MS)
    if (slotIndex < 0 || slotIndex >= slotCount) continue
    const min = toMajor(p.minEgpPerUsdtMinor ?? p.egpPerUsdtMinor)
    const avg = toMajor(p.avgEgpPerUsdtMinor ?? p.egpPerUsdtMinor)
    const max = toMajor(p.maxEgpPerUsdtMinor ?? p.egpPerUsdtMinor)
    const prev = slots[slotIndex]
    if (!prev || ts > prev.ts || (ts === prev.ts && i >= prev.order)) {
      slots[slotIndex] = { ts, order: i, min, avg, max }
    }
  }

  const out: LiveGridPoint[] = []
  let carried: { min?: number; avg?: number; max?: number } | null = null
  for (let i = 0; i < slotCount; i++) {
    const t = start + i * SLOT_MS
    const d = new Date(t)
    const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    const hour = d.getUTCHours()
    const s = slots[i]
    if (s) {
      carried = { min: s.min, avg: s.avg, max: s.max }
      out.push({ t, day, hour, liveMin: s.min, liveAvg: s.avg, liveMax: s.max })
    } else if (carried) {
      out.push({ t, day, hour, liveMin: carried.avg, liveAvg: carried.avg, liveMax: carried.avg })
    } else {
      out.push({ t, day, hour })
    }
  }
  return out
}

export type BufferViewportInput = {
  readonly windowDays: number
  readonly windowOffsetDays: number
  readonly bufferDays: number      // actual days represented by the buffer (<= windowDays*3)
  readonly bufferCount: number     // number of rendered points/slots in the buffer
  readonly visibleCount: number    // number of rendered points/slots in one visible window
  readonly slotsPerDay: number     // 8 for the live 3-hour grid, 1 for daily domains
  readonly plotLeft: number
  readonly plotWidth: number
}

export type BufferViewport = {
  readonly bufferLeft: number      // x of buffer index 0
  readonly bufferSpan: number      // total x width of the buffer
  readonly tx: number              // translateX to put the visible window at plotLeft
}

export function bufferViewport(input: BufferViewportInput): BufferViewport {
  const fallback = { bufferLeft: input.plotLeft, bufferSpan: input.plotWidth, tx: 0 }
  const values = [
    input.windowDays,
    input.windowOffsetDays,
    input.bufferDays,
    input.bufferCount,
    input.visibleCount,
    input.slotsPerDay,
    input.plotLeft,
    input.plotWidth,
  ]
  if (values.some((v) => !Number.isFinite(v)) || input.bufferCount <= 0) return fallback

  const bufferOffset = Math.max(0, input.windowOffsetDays - input.windowDays)
  const daysFromBufferEnd = input.windowOffsetDays - bufferOffset
  const rawBufferSpan = (input.bufferDays / input.windowDays) * input.plotWidth
  const bufferSpan = Number.isFinite(rawBufferSpan) && rawBufferSpan > 0 ? rawBufferSpan : 0
  const bufferLeft = input.plotLeft + input.plotWidth - bufferSpan

  const bufferX = (i: number): number => {
    return bufferLeft + (i / input.bufferCount) * bufferSpan
  }

  const visibleStart = input.bufferCount - daysFromBufferEnd * input.slotsPerDay - input.visibleCount
  const tx = input.plotLeft - bufferX(visibleStart)

  if (!Number.isFinite(bufferLeft) || !Number.isFinite(bufferSpan) || !Number.isFinite(tx)) return fallback
  return { bufferLeft, bufferSpan, tx }
}
