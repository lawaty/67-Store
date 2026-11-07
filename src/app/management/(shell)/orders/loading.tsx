/**
 * Loading UI for the /management/orders route that mirrors the filters,
 * table, and pagination layout.
 */

import {
  LoadingRegion,
  Skeleton,
  SkeletonButton,
  SkeletonHeading,
  SkeletonTable,
} from "@/app/skeleton"

export default function OrdersLoading() {
  return (
    <LoadingRegion>
      <main dir="rtl">
        <SkeletonHeading />

        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-e1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={i === 4 ? "field lg:col-span-2" : "field"}>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <SkeletonButton className="w-24" />
          </div>
        </div>

        <SkeletonTable cols={8} rows={8} className="mt-4" />

        <div className="mt-5 flex items-center justify-between gap-3">
          <SkeletonButton className="w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <SkeletonButton className="w-20" />
        </div>
      </main>
    </LoadingRegion>
  )
}
