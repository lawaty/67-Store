"use client"
/**
 * Polls `/api/admin/stats` every 30s, refreshes on visibility, window focus,
 * and route change, and hides itself on 401.
 */

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import type { AdminStatsDto } from "@/api/contracts/admin"
import { Skeleton } from "@/app/skeleton"
import { formatUsdtMilli } from "@/frontend/format"
import PartitionBar from "./(shell)/viz/partition-bar"

type StatsStatus = "loading" | "ready" | "error"

export function SidebarStats({ layout = "sidebar" }: { readonly layout?: "sidebar" | "bar" }) {
  const pathname = usePathname()
  const [data, setData] = useState<AdminStatsDto | null>(null)
  const [status, setStatus] = useState<StatsStatus>("loading")
  const [hidden, setHidden] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stats?t=${Date.now()}`, { cache: "no-store" })
      if (res.status === 401) {
        setHidden(true)
        return
      }
      if (!res.ok) {
        setStatus((prev) => (prev === "loading" ? "error" : "error"))
        return
      }
      const json = (await res.json()) as AdminStatsDto
      setData(json)
      setStatus("ready")
      setHidden(false)
    } catch {
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => {
      void load()
    }, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load()
    }
    const onFocus = () => void load()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", onFocus)
    }
  }, [load, pathname])

  if (hidden) return null

  const dimmed = status === "error" && data !== null
  const showSkeleton = status === "loading" && data === null

  if (layout === "bar") {
    return (
      <div className={"flex gap-2 overflow-x-auto pb-1" + (dimmed ? " opacity-60" : "")}>
        {showSkeleton ? (
          <>
            <Skeleton className="h-8 w-24 shrink-0 rounded-xl" />
            <Skeleton className="h-8 w-24 shrink-0 rounded-xl" />
            <Skeleton className="h-8 w-24 shrink-0 rounded-xl" />
            <Skeleton className="h-8 w-24 shrink-0 rounded-xl" />
          </>
        ) : (
          cells(data).map((cell) => (
            <div
              key={cell.label}
              className={
                "shrink-0 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm " +
                (cell.danger ? "text-danger" : "")
              }
            >
              <span className="text-muted" title={cell.title}>{cell.label}: </span>
              <span className="tabular-nums" dir="ltr">
                {cell.value}
              </span>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className={"mb-4 border-b border-line px-2 pb-4" + (dimmed ? " opacity-60" : "")}>
      {!showSkeleton && data !== null && data.recordedUsdtMilli !== null && data.reservedUsdtMilli !== null ? (
        <div className="mb-2 px-1">
          <PartitionBar
            compact
            total={{ label: "المسجل", minor: data.recordedUsdtMilli }}
            parts={[
              { label: "محجوز", minor: data.reservedUsdtMilli, tone: "sky" },
              { label: "متاح", minor: data.availableUsdtMilli ?? 0, tone: "jade" },
            ]}
            format={formatUsdtMilli}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {showSkeleton
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-line bg-canvas/50 px-2 py-2">
                <Skeleton className="h-[10px] w-16" />
                <Skeleton className="mt-1 h-[13px] w-20" />
              </div>
            ))
          : cells(data).map((cell) => (
              <div key={cell.label} className="rounded-xl border border-line bg-canvas/50 px-2 py-2">
                <p className="text-xs leading-none text-muted" title={cell.title}>{cell.label}</p>
                <p
                  className={
                    "mt-1 text-sm leading-none tabular-nums " + (cell.danger ? "text-danger" : "text-ink")
                  }
                  dir="ltr"
                >
                  {cell.value}
                </p>
              </div>
            ))}
      </div>
      {!showSkeleton ? (
        <p className="mt-2 text-xs text-muted">
          آخر تحديث {formatTime(data?.updatedAt)}
          {data?.balanceError ? " · ما قدرناش نجيب الرصيد" : ""}
        </p>
      ) : null}
    </div>
  )
}

function cells(data: AdminStatsDto | null): { label: string; value: string; danger: boolean; title?: string }[] {
  return [
    { label: "إجمالي الخزينة", value: formatUsdt(data?.balanceUsdtMilli ?? null), danger: false },
    { label: "سعر السوق", value: formatEgp(data?.p2pEgpPerUsdtMinor ?? null), danger: false, title: "سعر شراء USDT من P2P الآن" },
    { label: "WAC", value: formatEgp(data?.wacEgpMinor ?? null), danger: false, title: "متوسط تكلفة USDT المسجل" },
    {
      label: "المتاح",
      value: formatUsdt(data?.availableUsdtMilli ?? null),
      danger: data?.availableUsdtMilli != null && data.availableUsdtMilli < 0,
    },
  ]
}

function formatUsdt(milli: number | null): string {
  if (milli === null) return "—"
  return formatUsdtMilli(milli)
}

function formatEgp(minor: number | null): string {
  if (minor === null) return "—"
  return (
    (minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ج.م"
  )
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
}
