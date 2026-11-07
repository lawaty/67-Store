"use client"
/**
 * Compact funding-lot dialog. Prefills the amount from free USDT and the
 * current maximum live P2P price; both fields display in major units.
 */
import { useRef, useState } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { recordFunding } from "./actions"

export function FundingModal({
  defaultEgpPaidMinor,
  defaultUsdtMinor,
  maxUsdtMinor,
}: {
  readonly defaultEgpPaidMinor: number
  readonly defaultUsdtMinor: number
  readonly maxUsdtMinor: number
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [usdtValue, setUsdtValue] = useState((defaultUsdtMinor / 100).toFixed(2))
  const usdtMinor = Math.round(Number(usdtValue) * 100)
  const exceedsFree = Number.isFinite(usdtMinor) && usdtMinor > maxUsdtMinor

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => dialog.current?.showModal()}>
        <Icon name="plus" size={15} /> تمويل جديد
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <form action={recordFunding}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">تمويل جديد</h2>
            <button
              type="button"
              className="btn-icon"
              aria-label="إغلاق"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="field">
              <label htmlFor="egpPaid">إجمالي EGP المدفوع</label>
              <input
                id="egpPaid"
                name="egpPaid"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                defaultValue={(defaultEgpPaidMinor / 100).toFixed(2)}
              />
            </div>
            <div className="field">
              <label htmlFor="usdt">USDT المستلم</label>
              <input
                id="usdt"
                name="usdt"
                type="number"
                step="0.01"
                min="0.01"
                max={(maxUsdtMinor / 100).toFixed(2)}
                inputMode="decimal"
                required
                value={usdtValue}
                onChange={(event) => setUsdtValue(event.target.value)}
              />
            </div>
          </div>
          <p className="hint mt-3">الحر المتاح: {(maxUsdtMinor / 100).toFixed(2)} USDT</p>
          {exceedsFree ? (
            <p className="alert mt-3">الكمية أكبر من USDT الحر المتاح ({(maxUsdtMinor / 100).toFixed(2)} USDT).</p>
          ) : null}
          <SubmitButton className="btn btn-primary btn-block mt-4" disabled={exceedsFree}>تسجيل التمويل</SubmitButton>
        </form>
      </dialog>
    </>
  )
}
