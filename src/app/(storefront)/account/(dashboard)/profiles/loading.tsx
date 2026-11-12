/**
 * Loading UI for the /account/profiles route, mirroring the roster grid and
 * rail add-profile form inside the shared account shell.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonCircle, SkeletonHeading } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion>
      <SkeletonHeading className="account-header" />

      <div className="account-body">
        <div className="account-main">
          <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
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
        </div>

        <aside className="account-rail">
          <div className="card" aria-hidden="true">
            <Skeleton className="h-3 w-40" />
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="grid gap-4">
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
        </aside>
      </div>
    </LoadingRegion>
  )
}
