/**
 * Loading UI for the /account/fund route, mirroring the fund wallet page geometry.
 * Shows skeleton placeholders for the heading and the quote form.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonHeading } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <div className="mx-auto w-full max-w-3xl">
        <LoadingRegion>
          <SkeletonHeading actions={false} />

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <SkeletonButton className="w-36" />
          </div>
        </LoadingRegion>
      </div>
    </main>
  )
}
