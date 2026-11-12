"use client"
/**
 * Deletes an admin achievement after confirmation, then refreshes the
 * server-rendered list.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/app/icons"

export function AchievementDelete({ id }: { id: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(): Promise<void> {
    if (!window.confirm("تأكيد حذف الإنجاز؟")) return

    setPending(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/achievements/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        setError("تعذر حذف الإنجاز.")
        return
      }

      router.refresh()
    } catch {
      setError("تعذر الاتصال بالخادم.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleDelete}
        disabled={pending}
        aria-busy={pending}
      >
        <Icon name="trash" size={14} /> {pending ? "جارٍ الحذف…" : "حذف"}
      </button>
      {error ? (
        <p className="alert mt-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
