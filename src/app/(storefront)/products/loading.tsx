/**
 * Loading skeleton for the full catalogue route (`/products`), mirroring the
 * compact header, diamonds grid, packs grid and trust/features strip.
 */
import { LoadingRegion, Skeleton, SkeletonCards } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="page">
      <LoadingRegion>
        <section className="section">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-3 w-28" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </section>

        <section className="section">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
          <SkeletonCards count={8} className="product-grid mt-6 max-h-[min(40rem,65vh)] overflow-y-auto overscroll-contain pretty-scrollbar" />
        </section>

        <section className="section">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
          <SkeletonCards count={4} className="product-grid mt-6 max-h-[min(40rem,65vh)] overflow-y-auto overscroll-contain pretty-scrollbar" />
        </section>

        <section className="section">
          <Skeleton className="h-48 w-full rounded-2xl" />
        </section>
      </LoadingRegion>
    </main>
  )
}
