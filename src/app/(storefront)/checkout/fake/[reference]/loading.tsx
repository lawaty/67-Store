/**
 * Loading UI for the /checkout/fake/[reference] route, mirroring the fake checkout page geometry.
 * Shows skeleton placeholders for payment details and the pay action.
 */
import { LoadingRegion, Skeleton, SkeletonButton } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion className="page">
      <div className="mx-auto w-full max-w-xl">
        <SkeletonButton className="w-36" />

        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-e2">
          <div className="ember-seam h-1" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>

            <Skeleton className="mt-4 h-8 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />

            <div className="mt-6 rounded-2xl border border-line bg-raised/50 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 flex-none rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
              </div>
              <Skeleton className="mt-5 h-3 w-16" />
              <Skeleton className="mt-2 h-9 w-40" />
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>

            <SkeletonButton className="mt-6 min-h-12 w-full" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </LoadingRegion>
  )
}
