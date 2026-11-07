/**
 * Loading skeleton for the order status route, mirroring the timeline and receipt layout.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonCircle } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion className="page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SkeletonButton className="w-36" />
        <SkeletonButton className="w-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <header>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg" />
            <Skeleton className="mt-4 h-7 w-28 rounded-full" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
          </header>

          <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="timeline mt-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="timeline-step">
                  <SkeletonCircle className="h-8 w-8 flex-none" />
                  <div className="timeline-body flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-full max-w-sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="player-card mt-4">
            <div className="flex items-center gap-3">
              <SkeletonCircle className="h-12 w-12 flex-none" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-5 w-40" />
                <div className="player-meta mt-1.5">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-8 w-32" />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-line bg-surface/60 p-4">
            <div className="flex items-start gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          </div>
        </aside>
      </div>
    </LoadingRegion>
  )
}
