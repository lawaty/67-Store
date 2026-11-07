"use client"
/**
 * Compact coin-purchase dialog. Records a manual deposit in major units;
 * Instapay and Crypto gateways are not live yet.
 */
import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { recordDeposit } from "./actions"

export function PurchaseModal() {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => dialog.current?.showModal()}>
        <Icon name="plus" size={15} /> شراء جديد
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <form action={recordDeposit}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">شراء جديد</h2>
            <button
              type="button"
              className="btn-icon"
              aria-label="إغلاق"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="mt-4 stack">
            <div className="field">
              <label htmlFor="purchaseClientId">معرّف العميل</label>
              <input id="purchaseClientId" name="clientId" type="text" dir="ltr" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <label htmlFor="purchaseCurrency">العملة</label>
                <select id="purchaseCurrency" name="currency" defaultValue="EGP">
                  <option value="EGP">EGP</option>
                  <option value="USD">USDT</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="purchaseAmount">المبلغ</label>
                <input
                  id="purchaseAmount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  required
                />
              </div>
            </div>
          </div>
          <p className="hint mt-3">
            <Icon name="shield" size={14} /> تسجيل يدوي؛ بوابات Instapay وCrypto مش شغالة لسه.
          </p>
          <SubmitButton className="btn btn-primary btn-block mt-4">تسجيل الشراء</SubmitButton>
        </form>
      </dialog>
    </>
  )
}
