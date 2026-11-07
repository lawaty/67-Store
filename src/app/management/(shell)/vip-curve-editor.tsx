"use client"
/**
 * Admin VIP level editor: rows of thresholds, margins, titles, icons and
 * colours posted to the saveVipCurve server action. The first row is the
 * locked base level at 0 coins.
 */

import { Fragment, useState } from "react"
import { saveVipCurve } from "./actions"
import { SubmitButton } from "@/app/submit-button"
import { Icon } from "@/app/icons"
import {
  LEVEL_ICONS,
  LEVEL_COLORS,
  type LevelColor,
  type LevelIcon,
} from "@/shared/level-badge"

type Row = {
  key: string
  title: string
  coins: string
  percent: string
  icon: LevelIcon
  color: LevelColor
}

const ICON_LABELS: Record<LevelIcon, string> = {
  shield: "درع",
  gem: "جوهرة",
  flame: "لهب",
  sparkles: "بريق",
  bolt: "برق",
  coins: "عملات",
  gift: "هدية",
  tag: "وسم",
}

const COLOR_LABELS: Record<LevelColor, string> = {
  sky: "سماوي",
  jade: "أخضر",
  gold: "ذهبي",
  ember: "برتقالي",
}

const BADGE_CLASSES: Record<LevelColor, string> = {
  sky: "border-sky/40 bg-sky/10 text-sky-strong dark:text-sky",
  jade: "border-jade/40 bg-jade/10 text-jade",
  gold: "border-gold/40 bg-gold/15 text-gold",
  ember: "border-ember/40 bg-ember/10 text-ember",
}

function isLevelIcon(value: string): value is LevelIcon {
  return (LEVEL_ICONS as readonly string[]).includes(value)
}

function isLevelColor(value: string): value is LevelColor {
  return (LEVEL_COLORS as readonly string[]).includes(value)
}

function toRows(
  initial: readonly {
    key: string
    coins: number
    basisPoints: number
    title: string
    icon: string
    color: string
  }[],
): Row[] {
  return initial.map((level, index) => ({
    key: level.key,
    title: level.title,
    coins: index === 0 ? "0" : String(level.coins),
    percent: String(level.basisPoints / 100),
    icon: isLevelIcon(level.icon) ? level.icon : "sparkles",
    color: isLevelColor(level.color) ? level.color : "sky",
  }))
}

export function VipCurveEditor({ initial }: { readonly initial: readonly { key: string; coins: number; basisPoints: number; title: string; icon: string; color: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))

  function addRow(): void {
    setRows((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${rows.length}`,
        title: "",
        coins: "",
        percent: "",
        icon: "sparkles" as LevelIcon,
        color: "sky" as LevelColor,
      },
    ])
  }

  function removeRow(index: number): void {
    setRows((current) =>
      index === 0 || current.length <= 1
        ? current
        : current.filter((_, i) => i !== index),
    )
  }

  function updateText(
    index: number,
    field: "title" | "coins" | "percent",
    value: string,
  ): void {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  function updateIcon(index: number, value: string): void {
    if (!isLevelIcon(value)) return
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, icon: value } : row)),
    )
  }

  function updateColor(index: number, value: string): void {
    if (!isLevelColor(value)) return
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, color: value } : row)),
    )
  }

  return (
    <form
      action={saveVipCurve}
      className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1 sm:p-6"
    >
      <h2 className="text-base font-semibold">مستويات VIP</h2>
      <p className="hint mt-1">
        حجم العملات المستهلكة خلال آخر 30 يومًا يحدد مستواك؛ كلما زاد انخفض
        الهامش (الخصم في الاتجاه المعاكس).
      </p>

      <div className="mt-4 grid gap-3">
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="levelKey" value={row.key} />
              <div className="field">
                <label htmlFor={`title-${index}`}>العنوان</label>
                <input
                  id={`title-${index}`}
                  type="text"
                  name="levelTitle"
                  required
                  maxLength={40}
                  value={row.title}
                  onChange={(event) =>
                    updateText(index, "title", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`coins-${index}`}>العملات المستهلكة</label>
                <input
                  id={`coins-${index}`}
                  type="number"
                  name="levelCoins"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={index === 0 ? "0" : row.coins}
                  readOnly={index === 0}
                  onChange={(event) =>
                    updateText(index, "coins", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`percent-${index}`}>الهامش (٪)</label>
                <input
                  id={`percent-${index}`}
                  type="number"
                  name="levelPercent"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={row.percent}
                  onChange={(event) =>
                    updateText(index, "percent", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`icon-${index}`}>الأيقونة</label>
                <select
                  id={`icon-${index}`}
                  name="levelIcon"
                  value={row.icon}
                  onChange={(event) => updateIcon(index, event.target.value)}
                >
                  {LEVEL_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {ICON_LABELS[icon]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`color-${index}`}>اللون</label>
                <select
                  id={`color-${index}`}
                  name="levelColor"
                  value={row.color}
                  onChange={(event) => updateColor(index, event.target.value)}
                >
                  {LEVEL_COLORS.map((color) => (
                    <option key={color} value={color}>
                      {COLOR_LABELS[color]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col items-start gap-2 sm:col-span-2 lg:col-span-1 lg:items-end">
                <span
                  className={`vip-preview inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_CLASSES[row.color]}`}
                >
                  <Icon name={row.icon} size={14} />
                  {row.title || "—"}
                </span>
                {index === 0 ? (
                  <span className="badge self-start lg:self-end">أساسي</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => removeRow(index)}
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
            {index === 0 ? (
              <p className="hint sm:col-span-2 lg:col-span-full">
                المستوى الأساسي يبدأ من 0 عملة ولا يمكن تغيير حدّه؛ عدّل هامشه
                فقط. المستويات التالية لها حدود قابلة للتعديل.
              </p>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={addRow}>
          إضافة صف
        </button>
      </div>

      <div className="mt-5 flex justify-end">
        <SubmitButton className="btn btn-primary">حفظ المستويات</SubmitButton>
      </div>
    </form>
  )
}
