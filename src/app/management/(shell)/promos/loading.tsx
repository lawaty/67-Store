/**
 * Loading UI for the /management/promos route that mirrors the create form
 * and promo table layout.
 */

import { LoadingRegion, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function PromosLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading />

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <span className="skeleton block h-5 w-32" />
            <div className="mt-4 flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <span className="skeleton block h-4 w-24" />
                  <span className="skeleton block h-12 w-full rounded-xl" />
                </div>
              ))}
              <span className="skeleton block h-11 w-full rounded-xl" />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="skeleton block h-5 w-32" />
              <span className="skeleton block h-7 w-16 rounded-full" />
            </div>
            <SkeletonTable cols={7} rows={5} className="mt-3" />
          </section>
        </div>
      </main>
    </LoadingRegion>
  )
}
