"use client"

/**
 * Route error boundary for the management shell that reports the error and
 * retries rendering via the provided reset callback.
 */

import { useEffect } from "react"

export default function ManagementError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md">
        <div className="card-body text-center">
          <h2 className="text-xl font-semibold">ما قدرناش نحمّل لوحة التحكم</h2>
          <p className="mt-2 text-sm text-muted">
            حصل خطأ أثناء جلب بيانات الإدارة. جرّب تاني.
          </p>
          <div className="mt-6 flex justify-center">
            <button type="button" className="btn btn-primary" onClick={reset}>
              جرّب تاني
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
