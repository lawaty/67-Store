"use client"

import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { adjustWallet } from "./actions"

export function WalletAdjustModal({
  clientId,
  accountId,
  returnTo,
}: {
  readonly clientId: string
  readonly accountId: string
  readonly returnTo?: "users"
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const amountId = `walletAmount-${accountId}`
  const reasonId = `walletReason-${accountId}`

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => dialog.current?.showModal()}>
        تعديل الرصيد
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">تعديل المحفظة</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dialog.current?.close()}
          >
            إغلاق
          </button>
        </div>
        <form action={adjustWallet} className="mt-4 stack">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="accountId" value={accountId} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <div className="field">
            <label htmlFor={amountId}>عدد العملات</label>
            <input className="input" id={amountId} name="amount" type="number" min={1} step={1} required />
          </div>
          <div className="field">
            <label>الاتجاه</label>
            <div className="flex gap-4">
              <label className="check"><input type="radio" name="direction" value="credit" defaultChecked /> إضافة</label>
              <label className="check"><input type="radio" name="direction" value="debit" /> خصم</label>
            </div>
          </div>
          <div className="field">
            <label htmlFor={reasonId}>السبب (مطلوب)</label>
            <input className="input" id={reasonId} name="reason" required />
          </div>
          <SubmitButton className="btn btn-primary btn-block"><Icon name="save" size={15} /> تطبيق</SubmitButton>
        </form>
      </dialog>
    </>
  )
}
