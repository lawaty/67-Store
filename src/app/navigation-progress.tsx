"use client"
/**
 * Top-edge progress bar shown while the visitor navigates between storefront
 * pages. It starts on internal link clicks and completes when the new pathname
 * commits; external, hash-only and same-page links are ignored.
 */
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

type Phase = "idle" | "loading" | "done"

export function NavigationProgress() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const start = () => {
      if (timer.current !== null) clearTimeout(timer.current)
      setPhase("loading")
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null
      if (anchor === null) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href") ?? ""
      if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("#")) return
      const target = new URL(href, window.location.href)
      if (target.pathname === window.location.pathname && target.search === window.location.search) return
      start()
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      if (timer.current !== null) clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    setPhase((current) => (current === "loading" ? "done" : current))
    timer.current = setTimeout(() => setPhase("idle"), 400)
    return () => {
      if (timer.current !== null) clearTimeout(timer.current)
    }
  }, [pathname])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden">
      <span className={phase === "idle" ? "nav-progress" : phase === "loading" ? "nav-progress is-loading" : "nav-progress is-done"} />
    </div>
  )
}
