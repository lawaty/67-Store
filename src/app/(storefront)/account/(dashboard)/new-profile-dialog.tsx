"use client"

import { useRef } from "react"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"
import { PlayerIdentityFields } from "../../player-identity-fields"
import { addProfile } from "./profiles/actions"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export function NewProfileDialog({ locale }: { readonly locale: Locale }) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => dialog.current?.showModal()}>
        <Icon name="plus" size={15} />
        {t(locale, "account.newProfile")}
      </button>
      <dialog
        ref={dialog}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-e2 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{t(locale, "account.addNewProfile")}</h2>
          <button
            type="button"
            className="btn-icon"
            aria-label={t(locale, "account.close")}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <form action={addProfile} className="stack mt-4">
          <div className="field">
            <label htmlFor="game">{t(locale, "account.gameLabel")}</label>
            <select id="game" name="game" defaultValue="mlbb">
              <option value="mlbb">{t(locale, "account.mlbb")}</option>
            </select>
          </div>
          <PlayerIdentityFields locale={locale} variant="account" />
          <SubmitButton className="btn btn-primary">
            <Icon name="save" size={15} /> {t(locale, "account.saveProfile")}
          </SubmitButton>
        </form>
      </dialog>
    </>
  )
}
