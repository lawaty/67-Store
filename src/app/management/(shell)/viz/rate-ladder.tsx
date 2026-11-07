import { formatMinor } from "@/frontend/format"
import { VIZ_TONE, type VizTone } from "./types"

export type RateLadderProps = {
  rungs: readonly {
    label: string
    egpPerUsdtMinor: number | null
    tone: VizTone
    emphasis?: boolean
  }[]
  emptyLabel?: string
  ariaLabel?: string
}

export default function RateLadder({ rungs, emptyLabel, ariaLabel }: RateLadderProps) {
  if (rungs.length === 0) {
    if (emptyLabel === undefined) return null
    return (
      <div data-testid="rate-ladder" aria-label={ariaLabel}>
        <p className="text-sm text-muted">{emptyLabel}</p>
      </div>
    )
  }

  const values = rungs
    .map((r) => r.egpPerUsdtMinor)
    .filter((v): v is number => v !== null)
  const min = values.length > 0 ? Math.min(...values) : null
  const max = values.length > 0 ? Math.max(...values) : null
  const hasDistinct = min !== null && max !== null && min !== max

  function position(v: number): number {
    if (min === null || max === null || min === max) return 50
    return ((v - min) / (max - min)) * 100
  }

  return (
    <div data-testid="rate-ladder" aria-label={ariaLabel}>
      <div className="flex flex-col gap-2">
        {rungs.map((rung, index) => {
          const v = rung.egpPerUsdtMinor
          const formatted = v === null ? "—" : `${formatMinor(v, "EGP")} ج.م`
          const sentence =
            v === null
              ? `سعر ${rung.label} مش متاح.`
              : `سعر ${rung.label} ${formatMinor(v, "EGP")} ج.م.`
          const emphasisClass = rung.emphasis ? "font-bold text-ink" : "text-muted"
          return (
            <div
              key={`${rung.label}-${index}`}
              data-testid="rate-ladder-row"
              className={`flex items-center gap-3 ${emphasisClass}`}
            >
              <span data-testid="rate-ladder-label" className={`text-sm ${emphasisClass}`}>
                {rung.label}
              </span>
              <span
                data-testid="rate-ladder-value"
                className={`num text-sm ${emphasisClass}`}
                dir="ltr"
              >
                {formatted}
              </span>
              <div
                role="img"
                aria-label={sentence}
                dir="ltr"
                data-testid="rate-ladder-track"
                className="viz-track flex-1"
              >
                {v !== null ? (
                  <span
                    data-testid="rate-ladder-marker"
                    aria-hidden="true"
                    className="viz-dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${position(v)}%`, backgroundColor: VIZ_TONE[rung.tone] }}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {hasDistinct ? (
        <div
          dir="ltr"
          data-testid="rate-ladder-axis"
          className="mt-1.5 flex items-center justify-between text-sm text-muted"
        >
          <span data-testid="rate-ladder-axis-min" className="num" dir="ltr">
            {`${formatMinor(min as number, "EGP")} ج.م`}
          </span>
          <span data-testid="rate-ladder-axis-max" className="num" dir="ltr">
            {`${formatMinor(max as number, "EGP")} ج.م`}
          </span>
        </div>
      ) : null}
    </div>
  )
}
