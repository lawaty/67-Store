/**
 * Loading skeleton for the landing route (`/`), used as the storefront
 * group-level fallback: mirrors the hero stage, selector card, bundles grid
 * and view-all button geometry of the real page.
 */
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonCards } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <LoadingRegion>
        <section className="rounded-3xl border border-line bg-surface/60 p-6 sm:p-10">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-4/5 sm:h-12" />
            <Skeleton className="h-10 w-2/3 sm:h-12" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="mt-3 flex flex-wrap gap-3">
              <SkeletonButton className="w-44" />
              <SkeletonButton className="w-36" />
            </div>
          </div>
        </section>

        <section className="section">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-6 h-44 w-full rounded-2xl" />
        </section>

        <section className="section">
          <Skeleton className="h-7 w-48" />
          <SkeletonCards count={3} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" />
          <SkeletonButton className="mt-6 h-12 w-full rounded-2xl" />
        </section>
      </LoadingRegion>
    </main>
  )
}
