/**
 * Shared preload primitives: skeleton bars, circles and cards plus the
 * `LoadingRegion` status wrapper used by every route-level `loading.tsx`.
 */
import type { ReactNode } from "react"

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={"skeleton block " + className} />
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={"flex flex-col gap-2 " + className}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className={"skeleton block h-4 " + (i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({
  className = "h-10 w-10",
}: {
  className?: string
}) {
  return <span aria-hidden="true" className={"skeleton block rounded-full " + className} />
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={"skeleton block h-11 rounded-xl " + className} />
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent " +
        className
      }
    />
  )
}

export function LoadingRegion({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      {children}
    </div>
  )
}

export function SkeletonHeading({
  actions = true,
  className = "",
}: {
  actions?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={"flex flex-wrap items-start justify-between gap-4 " + className}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="skeleton block h-3 w-24" />
        <span className="skeleton block h-9 w-3/4" />
        <span className="skeleton block h-4 w-full" />
      </div>
      {actions ? <SkeletonButton className="w-28" /> : null}
    </div>
  )
}

export function SkeletonStatCards({
  count = 3,
  className = "",
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={"grid gap-3 sm:grid-cols-3 " + className}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-surface p-4 shadow-e1"
        >
          <span className="skeleton block h-3 w-20" />
          <span className="skeleton mt-3 block h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({
  cols = 4,
  rows = 6,
  className = "",
}: {
  cols?: number
  rows?: number
  className?: string
}) {
  const colBars = Array.from({ length: cols })
  const rowBars = Array.from({ length: rows })
  const cardRows = Array.from({ length: Math.min(rows, 4) })

  return (
    <div aria-hidden="true" className={className}>
      <div className="table-desktop">
        <div className="flex gap-4 border-b border-line px-4 py-3">
          {colBars.map((_, i) => (
            <span key={i} className="skeleton block h-4 flex-1" />
          ))}
        </div>
        <div className="flex flex-col">
          {rowBars.map((_, row) => (
            <div key={row} className="flex gap-4 border-b border-line px-4 py-4 last:border-b-0">
              {colBars.map((_, col) => (
                <span key={col} className="skeleton block h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="table-cards">
        {cardRows.map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-4 shadow-e1"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="skeleton block h-4 w-2/5" />
              <span className="skeleton block h-6 w-16 rounded-full" />
            </div>
            <span className="skeleton mt-3 block h-4 w-3/4" />
            <span className="skeleton mt-2 block h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonCards({
  count = 4,
  className = "grid gap-4 sm:grid-cols-2",
}: {
  count?: number
  className?: string
}) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-surface p-5 shadow-e1"
        >
          <div className="flex items-start gap-3">
            <SkeletonCircle className="h-10 w-10" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="skeleton block h-4 w-2/3" />
              <span className="skeleton block h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-4">
            <SkeletonText lines={2} />
          </div>
          <SkeletonButton className="mt-4 w-full" />
        </div>
      ))}
    </div>
  )
}
