import { formatBps } from "@/frontend/format"
import { VIZ_TONE, type VizTone } from "./types"

export type CoverageGaugeProps = {
  basisPoints: number
  label: string
  hint?: string
  ariaLabel?: string
  empty?: boolean
  emptyLabel?: string
}

const DEFAULT_EMPTY_LABEL = "لا توجد عملات مستحقة"

export default function CoverageGauge({ basisPoints, label, hint, ariaLabel, empty = false, emptyLabel = DEFAULT_EMPTY_LABEL }: CoverageGaugeProps) {
  const percent = basisPoints / 100
  const clamped = Math.min(Math.max(percent, 0), 100)
  const tone: VizTone = percent >= 100 ? "jade" : percent >= 50 ? "gold" : "danger"
  const formatted = formatBps(basisPoints, 1)

  if (empty) {
    return (
      <div data-testid="coverage-gauge">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">{label}</span>
          <span className="num text-sm font-bold text-ink" dir="ltr">
            —
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{emptyLabel}</p>
        {hint !== undefined ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    )
  }

  return (
    <div data-testid="coverage-gauge">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="num text-sm font-bold text-ink" dir="ltr">
          {formatted}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.max(100, Math.ceil(percent))}
        aria-valuenow={percent}
        aria-valuetext={formatted}
        aria-label={ariaLabel}
        data-testid="coverage-gauge-bar"
        className="coverage-bar mt-2"
      >
        <div
          className="coverage-bar-fill"
          data-testid="coverage-gauge-fill"
          style={{ width: `${clamped}%`, background: VIZ_TONE[tone] }}
        />
      </div>
      {hint !== undefined ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
