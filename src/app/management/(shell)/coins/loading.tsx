/**
 * Loading skeleton for the /management/coins route, mirroring the header and
 * operations table geometry.
 */
import { LoadingRegion, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function CoinsLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading />

        <section className="mt-6" aria-label="سجل العمليات">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="skeleton block h-5 w-24" />
            <span className="skeleton block h-7 w-16 rounded-full" />
          </div>
          <SkeletonTable cols={8} rows={4} className="mt-3" />
        </section>
      </main>
    </LoadingRegion>
  )
}
