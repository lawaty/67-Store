"use client"

/**
 * Pointer-reactive decoration for the landing page: an ember spotlight that
 * eases toward the cursor and a parallax drift on the floating gem/coin
 * motes. Decorative only — the layer is aria-hidden and pointer-events-none,
 * so it never intercepts clicks or focus. The pointer loop runs solely for
 * fine pointers (mouse/trackpad) and is skipped for touch users and whenever
 * reduced motion is preferred; both fall back to the static glow painted
 * from the `.hero-stage` CSS defaults.
 */
import { useEffect, useRef } from "react"
import { Coin } from "@/app/coin"
import { Icon } from "@/app/icons"

/** Per-frame lerp factor: how quickly the glow catches up with the cursor. */
const EASE = 0.25

export function PageGlow() {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const fine = window.matchMedia?.("(pointer: fine)")
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    // Touch or reduced-motion users keep the static CSS glow: no listeners.
    if (!fine?.matches || reduce?.matches) return

    let targetX = 0.5
    let targetY = 0.3
    let x = targetX
    let y = targetY
    let raf = 0

    function onMove(event: PointerEvent) {
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const clamp = (value: number) => Math.min(1.2, Math.max(-0.2, value))
      targetX = clamp(event.clientX / width)
      targetY = clamp(event.clientY / height)
    }

    function tick() {
      const dx = targetX - x
      const dy = targetY - y
      if (Math.abs(dx) > 0.0004 || Math.abs(dy) > 0.0004) {
        x += dx * EASE
        y += dy * EASE
        layer!.style.setProperty("--glow-x", `${(x * 100).toFixed(2)}%`)
        layer!.style.setProperty("--glow-y", `${(y * 100).toFixed(2)}%`)
        layer!.style.setProperty("--px", (x * 2 - 1).toFixed(3))
        layer!.style.setProperty("--py", (y * 2 - 1).toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }

    function stop() {
      window.removeEventListener("pointermove", onMove)
      reduce?.removeEventListener("change", onReduceChange)
      cancelAnimationFrame(raf)
      for (const name of ["--glow-x", "--glow-y", "--px", "--py"]) layer!.style.removeProperty(name)
    }

    function onReduceChange() {
      if (reduce?.matches) stop()
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    reduce?.addEventListener("change", onReduceChange)
    raf = requestAnimationFrame(tick)
    return stop
  }, [])

  return (
    <div ref={layerRef} aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="hero-blob animate-breathe start-[-12%] top-[-25%] h-64 w-64 bg-ember/25" />
      <div className="hero-blob animate-breathe end-[-14%] bottom-[-35%] h-80 w-80 bg-sky/20 [animation-delay:2.5s]" />
      <div className="hero-grid" />
      <div className="hero-glow-spot" />
      <span className="hero-mote animate-float start-[7%] top-[24%] text-gold/70 [--mote-depth:14px]">
        <Icon name="gem" size={22} />
      </span>
      <span className="hero-mote animate-float-slow end-[9%] top-[34%] opacity-80 [--mote-depth:22px]">
        <Coin size={30} />
      </span>
      <span className="hero-mote animate-float-slower end-[24%] bottom-[16%] text-ember/60 [--mote-depth:9px]">
        <Icon name="gem" size={15} />
      </span>
    </div>
  )
}
