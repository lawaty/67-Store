"use client"
/**
 * Client button that copies the current order page URL to the clipboard.
 */
import { useState } from "react"
import { Icon } from "@/app/icons"
import { t } from "@/i18n/dictionary"
import type { Locale } from "@/i18n/locale"

export function CopyLink({ locale }: { locale: Locale }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1800)
        } catch {
          /* clipboard can be unavailable; leave the label unchanged */
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={15} />
      {copied ? t(locale, "order.copied") : t(locale, "order.copyLink")}
    </button>
  )
}
