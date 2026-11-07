"use client"
/**
 * Form submit button that disables and shows a pending spinner via `useFormStatus`.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Spinner } from "./skeleton"

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />
          {pendingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
