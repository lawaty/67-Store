/**
 * Loading skeleton for the MLBB top-up method route, mirroring the checkout form and order summary layout.
 */
import { LoadingRegion, Skeleton, SkeletonButton } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion className="page pb-32 lg:pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SkeletonButton className="w-36" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <header>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          </header>

          <section className="mt-7">
            <Skeleton className="h-4 w-32" />
            <nav className="method-tabs mt-3" aria-hidden="true">
              <div className="method-tab">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="method-tab">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="method-tab">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-14" />
              </div>
            </nav>
          </section>

          <div className="mt-6 stack">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <div className="mt-4 grid gap-4">
                <div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-12 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-12 w-full rounded-xl" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6">
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 grid gap-4">
                <div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-12 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="summary">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-8 w-32" />
            </div>
            <SkeletonButton className="mt-4 w-full" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-8 rounded-full" />
          </div>
        </aside>
      </div>

      <div className="mobile-cta lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
          <SkeletonButton className="w-40" />
        </div>
      </div>
    </LoadingRegion>
  )
}
