"use client"
/**
 * Coin-index change cap dialog: the cap sits in the coins card (economy card),
 * alongside the coin economy metrics.
 */
import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { saveCoinIndexCap } from "./actions"

export function CoinIndexCapModal({
  coinIndexCapBps,
}: {
  readonly coinIndexCapBps: number
}) {
  const capDialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => capDialog.current?.showModal()}>
        <Icon name="settings" size={15} /> حد تغيير المؤشر
      </button>
      <dialog
        ref={capDialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <form action={saveCoinIndexCap}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">حد تغيير المؤشر</h2>
            <button
              type="button"
              className="btn-icon"
              aria-label="إغلاق"
              onClick={() => capDialog.current?.close()}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <p className="hint mt-2">الحد الحالي: {coinIndexCapBps} نقطة أساس.</p>
          <div className="mt-4 field">
            <label htmlFor="coinIndexCapBps">الحد الأقصى (نقاط أساس)</label>
            <input
              id="coinIndexCapBps"
              name="coinIndexCapBps"
              type="number"
              step="1"
              min="0"
              max="10000"
              inputMode="numeric"
              defaultValue={coinIndexCapBps}
            />
          </div>
          <p className="hint mt-2">تغيير الحد يغيّر سرعة حركة المؤشر.</p>
          <SubmitButton className="btn btn-primary btn-block mt-4">حفظ</SubmitButton>
        </form>
      </dialog>
    </>
  )
}
