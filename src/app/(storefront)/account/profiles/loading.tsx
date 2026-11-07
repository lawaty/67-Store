/**
 * Loading UI for the /account/profiles route, mirroring the redesigned profiles
 * roster geometry with ProfileCard-shaped skeletons and the add-profile block.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonCircle, SkeletonHeading } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <LoadingRegion>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SkeletonButton className="w-36" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <SkeletonHeading actions={false} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
              <div className="flex items-start gap-4">
                <SkeletonCircle className="h-14 w-14 rounded-2xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-1 h-3 w-28" />
                </div>
              </div>
              <div className="mt-4 border-t border-line pt-4">
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="add-profile mt-8 rounded-2xl border border-line bg-surface p-5 shadow-e1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
            <SkeletonButton className="w-36" />
          </div>
        </div>
      </LoadingRegion>
    </main>
  )
}
