/**
 * Loading skeleton for the /management/users/[id] route, mirroring the user
 * detail layout and wallet form geometry.
 */
import { LoadingRegion, SkeletonButton, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion>
      <main dir="rtl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SkeletonButton className="h-9 w-40" />
          <SkeletonButton className="h-8 w-24 rounded-full" />
        </div>

        <SkeletonHeading actions={false} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="skeleton block h-3 w-16" />
                  <span className="skeleton block h-8 w-48" />
                </div>
                <SkeletonButton className="h-10 w-28 rounded-full" />
              </div>

              <SkeletonTable cols={3} rows={6} className="mt-4" />
            </section>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <span className="skeleton block h-5 w-28" />
            <div className="mt-4 stack">
              <div className="field">
                <span className="skeleton block h-4 w-24" />
                <span className="skeleton mt-2 block h-11 w-full rounded-xl" />
              </div>
              <div className="field">
                <span className="skeleton block h-4 w-16" />
                <div className="mt-2 flex gap-4">
                  <span className="skeleton block h-5 w-20 rounded" />
                  <span className="skeleton block h-5 w-20 rounded" />
                </div>
              </div>
              <div className="field">
                <span className="skeleton block h-4 w-28" />
                <span className="skeleton mt-2 block h-11 w-full rounded-xl" />
              </div>
              <SkeletonButton className="h-11 w-full" />
            </div>
          </aside>
        </div>
      </main>
    </LoadingRegion>
  )
}
