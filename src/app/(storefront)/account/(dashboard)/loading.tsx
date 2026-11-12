/**
 * Loading UI for the /account route, mirroring the compact account layout:
 * section header plus main column and rail skeletons inside the shared shell.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion>
      <SkeletonHeading className="account-header" />

      <div className="account-body">
        <div className="account-main">
          <SkeletonTable cols={4} rows={5} />
        </div>

        <div className="account-rail">
          <div className="card" aria-hidden="true">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="card" aria-hidden="true">
            <Skeleton className="h-3 w-24" />
            <SkeletonButton className="w-full" />
            <SkeletonButton className="w-full" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  )
}
