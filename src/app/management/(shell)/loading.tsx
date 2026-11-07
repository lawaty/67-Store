/**
 * Loading UI for the /management dashboard route that mirrors the page's
 * KPI, chart, and summary layout.
 */

import {
  LoadingRegion,
  Skeleton,
  SkeletonHeading,
} from "@/app/skeleton"

export default function ManagementLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading actions />

        <div className="kpi-grid mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-4 shadow-e1"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>

        <section className="chart-card mt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-64 w-full" />
        </section>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </LoadingRegion>
  )
}
