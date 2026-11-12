import { formatMinor } from "@/frontend/format"
import PartitionBar from "./partition-bar"
import type { VizTone } from "./types"

export type BridgeBarProps = {
  total: { label: string; minor: number | null }
  parts: readonly { label: string; minor: number; tone: VizTone }[]
  currency?: string
  format?: (value: number) => string
  emptyLabel?: string
  ariaLabel?: string
}

const UNAVAILABLE_LABEL = "الرصيد المباشر مش متاح"

export default function BridgeBar({
  total,
  parts,
  currency,
  format,
  emptyLabel,
  ariaLabel,
}: BridgeBarProps) {
  const isUnavailable = total.minor === null
  const positiveSum = parts
    .filter((p) => p.minor > 0)
    .reduce((acc, p) => acc + p.minor, 0)
  const effectiveTotalMinor = isUnavailable ? positiveSum : (total.minor as number)
  const resolvedFormat = format ?? ((value: number) => formatMinor(value, currency))

  const partsDescription = parts
    .map((p) => `${p.label} ${resolvedFormat(p.minor)}`)
    .join("، ")
  const defaultAriaLabel = isUnavailable
    ? `جسر التسوية: ${partsDescription}، ${UNAVAILABLE_LABEL}.`
    : `جسر التسوية: ${partsDescription}، والمباشر ${resolvedFormat(total.minor as number)}.`
  const resolvedAriaLabel = ariaLabel ?? defaultAriaLabel

  return (
    <div>
      {isUnavailable ? (
        <p className="mt-1 text-sm text-muted" data-testid="bridge-unavailable">
          {UNAVAILABLE_LABEL}
        </p>
      ) : null}

      <div className="mt-3">
        <PartitionBar
          total={{ label: isUnavailable ? "مجموع الأجزاء" : total.label, minor: effectiveTotalMinor }}
          parts={parts}
          currency={currency}
          format={resolvedFormat}
          emptyLabel={emptyLabel}
          ariaLabel={resolvedAriaLabel}
        />
      </div>
    </div>
  )
}
