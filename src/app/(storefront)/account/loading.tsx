/**
 * Loading UI for the /account route, mirroring the account overview page geometry.
 * Shows skeleton placeholders for heading, stats, tabs, and recent entries.
 */
import {
  LoadingRegion,
  Skeleton,
  SkeletonHeading,
  SkeletonStatCards,
  SkeletonTable,
} from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <LoadingRegion>
        <SkeletonHeading />

        <SkeletonStatCards count={4} className="mt-8" />

        <nav className="segmented segmented-4 mt-6" aria-hidden="true">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </nav>

        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <SkeletonTable cols={2} rows={5} className="mt-4" />
        </section>
      </LoadingRegion>
    </main>
  )
}
