import { formatBps, formatSignedBps } from "@/frontend/format"
import { VIZ_TONE } from "./types"

export type MoveBarProps = {
  moveBps: number | null
  capBps: number
  capped?: boolean
  ariaLabel?: string
}

const CAPPED_LABEL = "مثبت عند الحد"

export default function MoveBar({ moveBps, capBps, capped = false, ariaLabel }: MoveBarProps) {
  const capDenominator = Math.max(capBps, 1)
  const fillPct = moveBps === null ? 0 : Math.min(Math.abs(moveBps) / capDenominator, 1) * 50
  const isNegative = moveBps !== null && moveBps < 0
  const isPositive = moveBps !== null && moveBps > 0

  const defaultAriaLabel =
    moveBps === null
      ? `شريط الحركة: مفيش حركة متاحة، والحد ${formatBps(capBps)}.`
      : `شريط الحركة: ${formatSignedBps(moveBps)} ضمن حد ${formatBps(capBps)}${capped ? "، مثبت عند الحد" : ""}.`
  const resolvedAriaLabel = ariaLabel ?? defaultAriaLabel

  return (
    <div role="img" aria-label={resolvedAriaLabel}>
      <div className="viz-track" dir="ltr" data-testid="move-track">
        <span className="viz-center" aria-hidden="true" />
        {fillPct > 0 ? (
          <span
            className="viz-fill"
            data-testid="move-fill"
            style={
              isNegative
                ? {
                    left: `${50 - fillPct}%`,
                    width: `${fillPct}%`,
                    backgroundColor: VIZ_TONE.danger,
                  }
                : {
                    left: "50%",
                    width: `${fillPct}%`,
                    backgroundColor: VIZ_TONE.jade,
                  }
            }
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="num text-sm font-bold text-ink" dir="ltr">
          {moveBps === null ? "—" : formatSignedBps(moveBps)}
        </span>
        <span className="text-sm text-muted">
          الحد{" "}
          <span className="num" dir="ltr">
            {formatBps(capBps)}
          </span>
        </span>
        {capped ? (
          <span className="badge border-gold/40 bg-gold/15 text-ink" data-testid="move-capped">
            {CAPPED_LABEL}
          </span>
        ) : null}
        <span className="sr-only">
          {isPositive ? "حركة موجبة" : isNegative ? "حركة سالبة" : moveBps === 0 ? "بدون حركة" : "مفيش حركة"}
        </span>
      </div>
    </div>
  )
}
