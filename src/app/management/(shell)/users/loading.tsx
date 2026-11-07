/**
 * Loading skeleton for the /management/users route, mirroring the users
 * table and pagination layout.
 */
import { LoadingRegion, SkeletonButton, SkeletonHeading, SkeletonTable } from "@/app/skeleton"

export default function Loading() {
  return (
    <LoadingRegion>
      <main dir="rtl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <SkeletonHeading actions />
          <SkeletonButton className="h-8 w-24 rounded-full" />
        </header>

        <SkeletonTable cols={5} rows={8} className="mt-4" />

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SkeletonButton className="h-11 w-20" />
          </div>
          <SkeletonButton className="h-8 w-20 rounded-full" />
          <div className="flex items-center justify-end gap-2">
            <SkeletonButton className="h-11 w-20" />
          </div>
        </div>
      </main>
    </LoadingRegion>
  )
}
