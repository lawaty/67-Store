"use client"

import { useEffect, useRef, type ReactNode } from "react"

export function AutoSubmitForm({
  action,
  autoSubmit,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>
  autoSubmit: boolean
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (autoSubmit) ref.current?.requestSubmit()
  }, [autoSubmit])

  return (
    <form ref={ref} action={action} className={className}>
      {children}
    </form>
  )
}
