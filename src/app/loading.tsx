/**
 * Root route loading UI shown while a route segment suspends. Renders a centered
 * spinner and skeleton placeholders as a preloader.
 */
import { LoadingRegion, Skeleton, Spinner } from "@/app/skeleton"

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <LoadingRegion className="flex w-full max-w-xs flex-col items-center gap-4 text-muted">
        <Spinner className="h-8 w-8" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </LoadingRegion>
    </main>
  )
}
