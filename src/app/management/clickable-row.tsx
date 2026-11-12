"use client"

import { useRouter } from "next/navigation"
import type { KeyboardEvent, MouseEvent, ReactNode } from "react"

function shouldIgnoreNavigation(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof Element)) return false
  if (
    eventTarget.closest(
      'a, button, input, select, textarea, label, summary, form, [data-no-row-click]',
    )
  ) {
    return true
  }
  const selection = window.getSelection()?.toString()
  return Boolean(selection)
}

export function ClickableRow({
  href,
  children,
  className = "cursor-pointer",
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (shouldIgnoreNavigation(event.target)) return
    router.push(href)
  }

  return (
    <tr className={className} onClick={handleClick}>
      {children}
    </tr>
  )
}

export function ClickableCard({
  href,
  children,
  className = "cursor-pointer",
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (shouldIgnoreNavigation(event.target)) return
    router.push(href)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return
    if (shouldIgnoreNavigation(event.target)) return
    router.push(href)
  }

  return (
    <div
      role="link"
      tabIndex={0}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}
