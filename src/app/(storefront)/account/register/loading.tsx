/**
 * Loading skeleton for the registration form.
 */
import { LoadingRegion, Skeleton, SkeletonButton } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <LoadingRegion className="narrow">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-e1 sm:p-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-2/3" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <SkeletonButton className="mt-5 w-full" />
          <Skeleton className="mx-auto mt-6 h-3 w-1/2" />
        </div>
      </LoadingRegion>
    </main>
  )
}
