"use client"
/**
 * Keeps a non-terminal order page live by polling the public order endpoint and
 * refreshing the server-rendered page when the status changes. Polling stops on
 * terminal statuses and pauses while the tab is hidden.
 */
import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { OrderStatusDto } from "@/api/contracts"

const LIVE_STATUSES: readonly OrderStatusDto[] = ["AWAITING_PAYMENT", "PAID", "FULFILLING", "FAILED"]
const DEFAULT_INTERVAL_MS = 4_000

export function LiveStatus({
  token,
  status,
  intervalMs = DEFAULT_INTERVAL_MS,
}: {
  readonly token: string
  readonly status: OrderStatusDto
  readonly intervalMs?: number
}) {
  const router = useRouter()
  const known = useRef<OrderStatusDto>(status)

  useEffect(() => {
    known.current = status
  }, [status])

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(token)}?t=${Date.now()}`, {
        cache: "no-store",
      })
      if (!res.ok) return
      const next = (await res.json()) as { readonly status?: OrderStatusDto }
      if (next.status !== undefined && next.status !== known.current) {
        known.current = next.status
        router.refresh()
      }
    } catch {
      // Transient network failure; the next poll retries.
    }
  }, [router, token])

  useEffect(() => {
    if (!LIVE_STATUSES.includes(status)) return
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void check()
    }, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }
    const onFocus = () => {
      void check()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [check, intervalMs, status])

  return null
}
