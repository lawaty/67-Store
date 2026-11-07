/**
 * Loading skeleton for the /management/treasury route, mirroring balances,
 * forms, and transaction table geometry.
 */
import { LoadingRegion, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function TreasuryLoading() {
  return (
    <LoadingRegion>
      <main>
        <SkeletonHeading />

        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="الرصيد">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
              <span className="skeleton block h-3 w-20" />
              <span className="skeleton mt-3 block h-9 w-40" />
            </div>
          ))}
        </section>

        <section className="mt-6" aria-label="أسعار الإيداع">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="skeleton block h-5 w-28" />
            <span className="skeleton block h-7 w-16 rounded-full" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="skeleton block h-12 w-full rounded-xl" />
            ))}
          </div>
        </section>

        <section className="mt-6" aria-label="آخر تسوية">
          <span className="skeleton block h-5 w-24" />
          <div className="mt-3 grid gap-2 rounded-2xl border border-line bg-surface p-4 shadow-e1 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <span className="skeleton block h-3 w-14" />
                <span className="skeleton mt-2 block h-5 w-24" />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
          {Array.from({ length: 2 }).map((_, card) => (
            <section key={card} className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
              <span className="skeleton block h-5 w-28" />
              <div className="mt-4 flex flex-col gap-4">
                {Array.from({ length: card === 0 ? 6 : 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <span className="skeleton block h-4 w-24" />
                    <span className="skeleton block h-12 w-full rounded-xl" />
                  </div>
                ))}
                <span className="skeleton block h-11 w-full rounded-xl" />
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6" aria-label="التمويلات">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="skeleton block h-5 w-24" />
            <span className="skeleton block h-7 w-16 rounded-full" />
          </div>
          <SkeletonTable cols={6} rows={4} className="mt-3" />
        </section>

        <section className="mt-6" aria-label="الإيداعات">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="skeleton block h-5 w-24" />
            <span className="skeleton block h-7 w-16 rounded-full" />
          </div>
          <SkeletonTable cols={7} rows={4} className="mt-3" />
        </section>
      </main>
    </LoadingRegion>
  )
}
