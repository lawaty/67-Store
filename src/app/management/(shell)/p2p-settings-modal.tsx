"use client"
/**
 * P2P settings dialog: accumulation window and sync interval.
 */
import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { saveP2pSettings } from "./actions"

export function P2pSettingsModal({
  p2pSettings,
}: {
  readonly p2pSettings: {
    readonly windowHours: number
    readonly minWindowHours: number
    readonly maxWindowHours: number
    readonly syncIntervalSeconds: number
    readonly minSyncIntervalSeconds: number
    readonly maxSyncIntervalSeconds?: number
    readonly recommendedSyncIntervalSeconds: number
    readonly outlierSigma: number
    readonly minOutlierSigma: number
    readonly maxOutlierSigma: number
  }
}) {
  const minSync = p2pSettings.minSyncIntervalSeconds ?? 300
  const maxSync = p2pSettings.maxSyncIntervalSeconds ?? 10_800
  const recommendedSync = p2pSettings.recommendedSyncIntervalSeconds ?? 300
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.showModal()}>
        <Icon name="settings" size={15} /> إعدادات P2P
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <form action={saveP2pSettings}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">إعدادات P2P</h2>
            <button
              type="button"
              className="btn-icon"
              aria-label="إغلاق"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <p className="card-desc mt-2">
            الحالي: {p2pSettings.windowHours} ساعة — {p2pSettings.syncIntervalSeconds} ثانية · استبعاد الشواذ {p2pSettings.outlierSigma}σ
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="field">
              <label htmlFor="windowHours">نافذة التجميع (ساعات)</label>
              <input
                id="windowHours"
                name="windowHours"
                type="number"
                min={1}
                max={720}
                inputMode="numeric"
                required
                defaultValue={p2pSettings.windowHours}
              />
            </div>
            <div className="field">
              <label htmlFor="syncIntervalSeconds">فاصل المزامنة (ثانية)</label>
              <input
                id="syncIntervalSeconds"
                name="syncIntervalSeconds"
                type="number"
                min={minSync}
                max={maxSync}
                inputMode="numeric"
                required
                defaultValue={p2pSettings.syncIntervalSeconds}
              />
            </div>
          </div>
          <div className="mt-4 field">
            <label htmlFor="outlierSigma">حد استبعاد الشواذ (σ)</label>
            <input
              id="outlierSigma"
              name="outlierSigma"
              type="number"
              min={p2pSettings.minOutlierSigma}
              max={p2pSettings.maxOutlierSigma}
              step="1"
              inputMode="numeric"
              defaultValue={p2pSettings.outlierSigma}
            />
            <p className="hint">كل عرض يبعد عن المتوسط أكثر من هذا العدد من الانحرافات المعيارية يُستبعد قبل حساب السعر. الافتراضي ٢.</p>
          </div>
          <p className="mt-3 text-sm text-ember">
            فاصل المزامنة قابل للتعديل من 5 دقائق (300 ثانية) إلى 3 ساعات (10800 ثانية). يعرض المخطط نقاط 3 ساعات كما هو معمول به.
          </p>
          <SubmitButton className="btn btn-primary btn-block mt-4">حفظ الإعدادات</SubmitButton>
        </form>
      </dialog>
    </>
  )
}
