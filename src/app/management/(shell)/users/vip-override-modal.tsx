"use client"

import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { saveVipOverride, clearVipOverride } from "./actions"

export function VipOverrideModal({
  accountId,
  defaultPercent,
  defaultNote,
  hasOverride,
}: {
  readonly accountId: string
  readonly defaultPercent: number
  readonly defaultNote: string
  readonly hasOverride: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const percentId = `vipMarkupPercent-${accountId}`
  const noteId = `vipNote-${accountId}`

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => dialog.current?.showModal()}>
        تعديل الهامش
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">هامش مخصص</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dialog.current?.close()}
          >
            إغلاق
          </button>
        </div>
        <form action={saveVipOverride} className="mt-4 stack">
          <input type="hidden" name="accountId" value={accountId} />
          <div className="field">
            <label htmlFor={percentId}>هامش مخصص (٪)</label>
            <input className="input" id={percentId} name="markupPercent" type="number" min={0} step="0.01" defaultValue={defaultPercent} required />
          </div>
          <div className="field">
            <label htmlFor={noteId}>ملاحظة (اختياري)</label>
            <input className="input" id={noteId} name="note" defaultValue={defaultNote} />
          </div>
          <div className="flex gap-2">
            <SubmitButton className="btn btn-primary btn-sm flex-1"><Icon name="save" size={14} /> حفظ الهامش</SubmitButton>
            {hasOverride ? (
              <button formAction={clearVipOverride} className="btn btn-ghost btn-sm" type="submit">إزالة</button>
            ) : null}
          </div>
        </form>
      </dialog>
    </>
  )
}
