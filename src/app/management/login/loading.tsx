/**
 * Loading skeleton for the admin sign-in form.
 */
import { LoadingRegion, Skeleton, SkeletonButton } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10" dir="rtl">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-e2">
        <div className="ember-seam h-1" />
        <div className="p-6 sm:p-8">
          <Skeleton className="h-12 w-[70px]" />
          <Skeleton className="mt-5 h-3 w-20" />
          <Skeleton className="mt-2 h-9 w-4/5" />
          <Skeleton className="mt-2 h-4 w-full" />

          <LoadingRegion className="mt-6 stack">
            <div className="field">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-12 w-full rounded-xl" />
            </div>
            <SkeletonButton className="min-h-12 w-full" />
          </LoadingRegion>
        </div>
      </div>
    </main>
  )
}
