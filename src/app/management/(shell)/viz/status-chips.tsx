import { VIZ_TONE, type VizTone } from "./types"

export type StatusChipsProps = {
  items: readonly { label: string; tone: VizTone; detail?: string }[]
  emptyLabel?: string
}

export default function StatusChips({ items, emptyLabel }: StatusChipsProps) {
  if (items.length === 0) {
    if (emptyLabel === undefined) return null
    return <p className="text-sm text-muted">{emptyLabel}</p>
  }

  return (
    <ul data-testid="status-chips" className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          data-testid="status-chip"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-sm font-semibold text-muted"
        >
          <span
            aria-hidden="true"
            className="viz-dot"
            style={{ backgroundColor: VIZ_TONE[item.tone] }}
          />
          <span>{item.label}</span>
          {item.detail !== undefined ? (
            <span className="num text-ink" dir="ltr">
              {item.detail}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
