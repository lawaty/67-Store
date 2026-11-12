"use client"
/**
 * Admin achievement form: creates an achievement or edits an existing one via
 * the JSON admin API, then refreshes the server-rendered list.
 */

import { useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import type { AdminAchievementDto, AdminAchievementInput } from "@/api/contracts"
import {
  LEVEL_COLORS,
  LEVEL_ICONS,
  type LevelColor,
  type LevelIcon,
} from "@/shared/level-badge"
import { ACHIEVEMENT_TYPE_LABELS, ACHIEVEMENT_TYPES } from "@/shared/achievement"
import { Icon } from "@/app/icons"

function isAchievementType(value: string): value is AdminAchievementInput["type"] {
  return (ACHIEVEMENT_TYPES as readonly string[]).includes(value)
}

function isLevelIcon(value: string): value is LevelIcon {
  return (LEVEL_ICONS as readonly string[]).includes(value)
}

function isLevelColor(value: string): value is LevelColor {
  return (LEVEL_COLORS as readonly string[]).includes(value)
}

export function AchievementForm({ initial }: { initial?: AdminAchievementDto }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = initial !== undefined
  const fieldId = useId()

  const defaultIcon: LevelIcon =
    initial && isLevelIcon(initial.icon) ? initial.icon : LEVEL_ICONS[0]
  const defaultColor: LevelColor =
    initial && isLevelColor(initial.color) ? initial.color : LEVEL_COLORS[0]

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    const type = String(data.get("type") ?? "")
    if (!isAchievementType(type)) {
      setError("تحقق من النوع.")
      return
    }

    const payload: AdminAchievementInput = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      icon: String(data.get("icon") ?? ""),
      color: String(data.get("color") ?? ""),
      type,
      target: Number(data.get("target")),
      sortOrder: Number(data.get("sortOrder")),
      active: data.get("active") === "on",
    }

    setPending(true)
    setError(null)

    try {
      const response = await fetch(
        editing ? `/api/admin/achievements/${initial.id}` : "/api/admin/achievements",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        setError("تعذر حفظ الإنجاز. تحقق من البيانات وحاول مرة أخرى.")
        return
      }

      if (!editing) form.reset()
      router.refresh()
    } catch {
      setError("تعذر الاتصال بالخادم.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="field">
        <label htmlFor={`${fieldId}-title`}>العنوان</label>
        <input
          id={`${fieldId}-title`}
          type="text"
          name="title"
          required
          maxLength={80}
          defaultValue={initial?.title ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-description`}>
          الوصف
        </label>
        <textarea
          id={`${fieldId}-description`}
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-icon`}>الأيقونة</label>
        <select
          id={`${fieldId}-icon`}
          name="icon"
          defaultValue={defaultIcon}
        >
          {LEVEL_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-color`}>اللون</label>
        <select
          id={`${fieldId}-color`}
          name="color"
          defaultValue={defaultColor}
        >
          {LEVEL_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-type`}>النوع</label>
        <select
          id={`${fieldId}-type`}
          name="type"
          defaultValue={initial?.type ?? "TOTAL_ORDERS"}
        >
          {ACHIEVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACHIEVEMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-target`}>الهدف</label>
        <input
          id={`${fieldId}-target`}
          type="number"
          name="target"
          min={1}
          step={1}
          required
          defaultValue={initial?.target ?? 1}
        />
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-sort`}>الترتيب</label>
        <input
          id={`${fieldId}-sort`}
          type="number"
          name="sortOrder"
          step={1}
          defaultValue={initial?.sortOrder ?? 0}
        />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
        <span className="text-sm text-ink">مفعّل</span>
      </label>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
        <Icon name="save" size={15} /> حفظ
      </button>
    </form>
  )
}
