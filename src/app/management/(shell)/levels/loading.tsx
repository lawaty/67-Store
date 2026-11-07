/**
 * Loading UI for the /management/levels route that mirrors the VIP level
 * editor header and row layout.
 */

import {
  LoadingRegion,
  Skeleton,
  SkeletonHeading,
} from "@/app/skeleton"

export default function LevelsLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading />

        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
              >
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-11 w-28 rounded-xl" />
          <div className="mt-5 flex justify-end">
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </section>
      </main>
    </LoadingRegion>
  )
}
