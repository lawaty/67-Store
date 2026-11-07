import { formatMinor } from "@/frontend/format"
import { VIZ_TONE, type VizTone } from "./types"

export type P2pRange = {
  readonly minEgpPerUsdtMinor: number
  readonly avgEgpPerUsdtMinor: number
  readonly maxEgpPerUsdtMinor: number
  readonly adCount: number
  readonly stdDevEgpPerUsdtMinor?: number | null
  readonly outlierCount?: number
}

export type P2pPriceStripProps = {
  range: P2pRange | null
  currentEgpPerUsdtMinor?: number | null
  emptyLabel?: string
  ariaLabel?: string
}

const DEFAULT_EMPTY_LABEL = "نطاق عروض P2P مش متاح"

function formatEgp(value: number): string {
  return `${formatMinor(value, "EGP")} ج.م`
}

export default function P2pPriceStrip({
  range,
  currentEgpPerUsdtMinor = null,
  emptyLabel = DEFAULT_EMPTY_LABEL,
  ariaLabel,
}: P2pPriceStripProps) {
  const hasCurrent = currentEgpPerUsdtMinor != null

  if (range === null) {
    if (hasCurrent) {
      const currentLabel = `الحالي: ${formatEgp(currentEgpPerUsdtMinor)}`
      return (
        <div data-testid="p2p-price-strip" aria-label={ariaLabel ?? currentLabel}>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-sm text-ink">
              <span className="text-muted">الحالي: </span>
              <span data-testid="p2p-value-current" className="num" dir="ltr">
                {formatEgp(currentEgpPerUsdtMinor)}
              </span>
            </p>
          </div>
        </div>
      )
    }
    return (
      <div data-testid="p2p-price-strip" aria-label={ariaLabel}>
        <p className="text-sm text-muted">{emptyLabel}</p>
      </div>
    )
  }

  const points: Array<{
    kind: "min" | "avg" | "max" | "current"
    label: string
    value: number
    tone: VizTone
  }> = [
    { kind: "min", label: "الحد الأدنى", value: range.minEgpPerUsdtMinor, tone: "sky" },
    { kind: "avg", label: "المتوسط", value: range.avgEgpPerUsdtMinor, tone: "ember" },
    { kind: "max", label: "الحد الأعلى", value: range.maxEgpPerUsdtMinor, tone: "jade" },
  ]
  if (hasCurrent) {
    points.push({
      kind: "current",
      label: "الحالي",
      value: currentEgpPerUsdtMinor,
      tone: "gold",
    })
  }

  const extentValues = [
    range.minEgpPerUsdtMinor,
    range.maxEgpPerUsdtMinor,
    ...(hasCurrent ? [currentEgpPerUsdtMinor] : []),
  ]
  const min = Math.min(...extentValues)
  const max = Math.max(...extentValues)
  const hasDistinct = min !== max
  const pad = hasDistinct
    ? Math.max(1, Math.round((max - min) * 0.12))
    : Math.max(1, Math.round(Math.abs(max) * 0.01))
  const scaleMin = min - pad
  const scaleMax = max + pad

  function position(v: number): number {
    return ((v - scaleMin) / (scaleMax - scaleMin)) * 100
  }

  const baseSentence = `${points
    .map((p) => `${p.label} ${formatEgp(p.value)}`)
    .join("، ")}.`
  const stdDevSuffix =
    range.stdDevEgpPerUsdtMinor != null
      ? ` الانحراف المعياري ${formatEgp(range.stdDevEgpPerUsdtMinor)}.`
      : ""
  const sentence = `${baseSentence} عدد العروض ${range.adCount}. مستبعد ${range.outlierCount ?? 0}.${stdDevSuffix}`

  return (
    <div data-testid="p2p-price-strip" aria-label={ariaLabel}>
      <div className="flex min-w-0 flex-col gap-3">
        <div
          role="img"
          aria-label={sentence}
          title={sentence}
          dir="ltr"
          data-testid="p2p-track"
          className="p2p-scale-track mt-5"
        >
          <div className="p2p-scale-line" aria-hidden="true" />
          {points.map((point) => {
            const label = `${point.label}: ${formatEgp(point.value)}`
            return (
              <span
                key={point.kind}
                data-testid="p2p-marker"
                data-kind={point.kind}
                data-tooltip={label}
                title={label}
                aria-label={label}
                tabIndex={0}
                className="viz-point viz-dot"
                style={{
                  left: `${position(point.value)}%`,
                  backgroundColor: VIZ_TONE[point.tone],
                }}
              />
            )
          })}
          {points.map((point) => (
            <span
              key={`value-${point.kind}`}
              data-testid={`p2p-value-${point.kind}`}
              className="p2p-value num"
              style={{ left: `${position(point.value)}%` }}
            >
              {formatMinor(point.value, "EGP")}
            </span>
          ))}
        </div>
        <p
          data-testid="p2p-offer-count"
          className="text-xs text-muted"
          title="عدد عروض P2P في العينة التي حُسب منها النطاق"
        >
          عدد العروض: <span className="num" dir="ltr">{range.adCount}</span>
          {range.stdDevEgpPerUsdtMinor != null ? (
            <>
              {" · الانحراف المعياري: "}
              <span className="num" dir="ltr">{formatEgp(range.stdDevEgpPerUsdtMinor)}</span>
            </>
          ) : null}
          {" · مستبعد: "}
          <span className="num" dir="ltr">{range.outlierCount ?? 0}</span>
        </p>
      </div>
    </div>
  )
}
