/**
 * Loading UI for the /management/products route that mirrors the stat cards
 * and catalogue table layout.
 */

import {
  LoadingRegion,
  Skeleton,
  SkeletonHeading,
  SkeletonTable,
} from "@/app/skeleton"

export default function ProductsLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-56 rounded-full" />
          </div>
        </div>

        <Skeleton className="mt-2 h-5 w-full max-w-2xl" />

        <SkeletonTable cols={4} rows={6} className="mt-3" />
      </main>
    </LoadingRegion>
  )
}
