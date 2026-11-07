import { formatMinor } from "@/frontend/format"
import { VIZ_TONE, type VizTone } from "./types"

export type PartitionBarProps = {
  total: { label: string; minor: number }
  parts: readonly { label: string; minor: number; tone: VizTone }[]
  currency?: string
  formatValue?: (value: number) => string
  emptyLabel?: string
  ariaLabel?: string
  compact?: boolean
  showTotal?: boolean
}

const DEFAULT_EMPTY_LABEL = "مفيش بيانات لعرضها"
const RESIDUAL_LABEL = "مش موزع"
const DEFICIT_LABEL = "عجز"

export default function PartitionBar({
  total,
  parts,
  currency,
  formatValue = (value) => formatMinor(value, currency),
  emptyLabel = DEFAULT_EMPTY_LABEL,
  ariaLabel,
  compact,
  showTotal = true,
}: PartitionBarProps) {
  const positives = parts.filter((p) => p.minor > 0)
  const positiveSum = positives.reduce((acc, p) => acc + p.minor, 0)
  const isEmpty = total.minor <= 0 || positives.length === 0
  const residual = !isEmpty && positiveSum < total.minor ? total.minor - positiveSum : 0
  const deficit = !isEmpty && positiveSum > total.minor ? positiveSum - total.minor : 0

  // In the overdraft state the positive segments are clipped to full width.
  const denominator = !isEmpty ? Math.max(total.minor, positiveSum) : 1

  const defaultAriaLabel =
    parts.length > 0
      ? `مخطط الأجزاء: ${total.label} ${formatValue(total.minor)} — ${parts
          .map((p) => `${p.label} ${formatValue(p.minor)}`)
          .join("، ")}.`
      : `مخطط الأجزاء: ${total.label} ${formatValue(total.minor)}.`
  const resolvedAriaLabel = ariaLabel ?? defaultAriaLabel

  const hideHeader = compact || !showTotal

  return (
    <div>
      {hideHeader ? null : (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-muted">{total.label}</span>
          <span className="num text-sm font-bold text-ink" dir="ltr">
            {formatValue(total.minor)}
          </span>
        </div>
      )}

      <div role="img" aria-label={resolvedAriaLabel} className={hideHeader ? "" : "mt-2"}>
        {isEmpty ? (
          <p className="text-sm text-muted">{emptyLabel}</p>
        ) : (
          <>
            <div className={compact ? "viz-bar viz-bar-compact" : "viz-bar"} data-testid="partition-bar">
              {positives.map((p) => (
                <div
                  key={p.label}
                  className="viz-segment"
                  data-testid="partition-segment"
                  data-label={p.label}
                  title={`${p.label}: ${formatValue(p.minor)}`}
                  style={{
                    width: `${(p.minor / denominator) * 100}%`,
                    backgroundColor: VIZ_TONE[p.tone],
                  }}
                />
              ))}
              {residual > 0 ? (
                <div
                  className="viz-segment viz-segment-residual"
                  data-testid="partition-segment"
                  data-label={RESIDUAL_LABEL}
                  title={`${RESIDUAL_LABEL}: ${formatValue(residual)}`}
                  style={{
                    width: `${(residual / denominator) * 100}%`,
                    backgroundColor: VIZ_TONE.muted,
                  }}
                >
                  <span className="sr-only">{RESIDUAL_LABEL}</span>
                </div>
              ) : null}
            </div>
            {residual > 0 ? (
              <p className="viz-residual-note text-sm text-muted">
                {RESIDUAL_LABEL}:{" "}
                <span className="num" dir="ltr">
                  {formatValue(residual)}
                </span>
              </p>
            ) : null}
            {deficit > 0 ? (
              <div
                className="viz-deficit-strip mt-1 flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-sm font-bold text-danger"
                data-testid="partition-deficit"
              >
                <span
                  className="viz-dot"
                  style={{ backgroundColor: VIZ_TONE.danger }}
                  aria-hidden="true"
                />
                <span>
                  {DEFICIT_LABEL}:{" "}
                  <span className="num" dir="ltr">
                    {formatValue(deficit)}
                  </span>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {parts.length > 0 ? (
        <ul className={compact ? "viz-legend viz-legend-compact" : "viz-legend"}>
          {parts.map((p) => {
            const tone: VizTone = p.minor < 0 ? "danger" : p.tone
            return (
              <li key={p.label} className="viz-legend-item">
                <span
                  className="viz-dot"
                  style={{ backgroundColor: VIZ_TONE[tone] }}
                  aria-hidden="true"
                />
                <span>{p.label}</span>
                <span className="num" dir="ltr">
                  {formatValue(p.minor)}
                </span>
              </li>
            )
          })}
          {residual > 0 ? (
            <li className="viz-legend-item">
              <span
                className="viz-dot"
                style={{ backgroundColor: VIZ_TONE.muted }}
                aria-hidden="true"
              />
              <span>{RESIDUAL_LABEL}</span>
              <span className="num" dir="ltr">
                {formatValue(residual)}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
