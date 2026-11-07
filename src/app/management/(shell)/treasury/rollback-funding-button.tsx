"use client"
/**
 * Guarded rollback trigger for a funding lot: opens a native dialog
 * confirmation and submits the lot id to the `rollbackFunding` action.
 */
import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { formatMinor } from "@/frontend/format"
import { rollbackFunding } from "./actions"

export function RollbackFundingButton({
  id,
  usdtMinor,
}: {
  readonly id: string
  readonly usdtMinor: number
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.showModal()}>
        <Icon name="trash" /> تراجع
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <form action={rollbackFunding}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">تراجع عن التمويل</h2>
            <button
              type="button"
              className="btn-icon"
              aria-label="إغلاق"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <p className="hint mt-3">
            {formatMinor(usdtMinor, "USD")} USDT. هيتم حذف حركة التمويل وإعادة حساب WAC والرصيد.
          </p>
          <input type="hidden" name="id" value={id} />
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn" onClick={() => dialog.current?.close()}>
              إلغاء
            </button>
            <SubmitButton className="btn btn-danger">تأكيد التراجع</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  )
}
