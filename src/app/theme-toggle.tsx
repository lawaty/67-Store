"use client"
/**
 * Theme toggle button that flips the dark class on the root element and persists the choice in a cookie.
 */

import { Icon } from "@/app/icons"

export function ThemeToggle({ label }: { label: string }) {
  const onClick = () => {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`
  }
  return (
    <button type="button" className="btn-icon" onClick={onClick} aria-label={label} title={label}>
      <span className="dark:hidden"><Icon name="moon" size={18} /></span>
      <span className="hidden dark:inline"><Icon name="sun" size={18} /></span>
    </button>
  )
}
