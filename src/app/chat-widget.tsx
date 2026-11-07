"use client"
/**
 * Client widget that renders a floating help chat with preset questions and
 * localized answers. Manages open state and the list of revealed answers.
 */
import { useState } from "react"
import { Icon } from "./icons"
import type { Locale } from "@/i18n/locale"
import { t } from "@/i18n/dictionary"

type Answer = { question: string; answer: string }

export function ChatWidget({ locale = "ar" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState<Answer[]>([])

  const answers: Answer[] = [
    { question: t(locale, "chat.q1"), answer: t(locale, "chat.a1") },
    { question: t(locale, "chat.q2"), answer: t(locale, "chat.a2") },
    { question: t(locale, "chat.q3"), answer: t(locale, "chat.a3") },
    { question: t(locale, "chat.q4"), answer: t(locale, "chat.a4") },
    { question: t(locale, "chat.q5"), answer: t(locale, "chat.a5") },
  ]

  return (
    <div className="fixed bottom-24 end-4 z-50 flex flex-col items-end gap-3 lg:bottom-6">
      {open ? (
        <section
          className="w-[min(360px,calc(100vw-2rem))] animate-slide-in overflow-hidden rounded-2xl border border-line bg-surface shadow-e2"
          aria-label={t(locale, "chat.ariaLabel")}
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <Icon name="chat" size={17} />
              {t(locale, "chat.title")}
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:bg-raised"
              onClick={() => setOpen(false)}
              aria-label={t(locale, "common.closeAria")}
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
            <p className="max-w-[85%] rounded-2xl rounded-es-sm border border-line bg-raised px-3.5 py-2.5 text-sm leading-relaxed text-ink">
              {t(locale, "chat.greeting")}
            </p>
            {shown.map((item) => (
              <div key={item.question} className="space-y-2">
                <p className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm border border-transparent bg-ember px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-on-ember">
                  {item.question}
                </p>
                <p className="max-w-[85%] rounded-2xl rounded-es-sm border border-line bg-raised px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line p-3">
            {answers.map((item) => (
              <button
                key={item.question}
                type="button"
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:border-ember/40 hover:text-ink"
                onClick={() => setShown((prev) => (prev.some((p) => p.question === item.question) ? prev : [...prev, item]))}
              >
                {item.question}
              </button>
            ))}
          </div>

          <p className="border-t border-line px-4 py-2 text-[11px] text-muted">{t(locale, "chat.note")}</p>
        </section>
      ) : null}

      <button
        type="button"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-ember text-on-ember shadow-glow transition hover:brightness-110"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={t(locale, "chat.fabAria")}
      >
        <Icon name={open ? "close" : "chat"} size={22} />
        {open ? null : <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-jade" aria-hidden="true" />}
      </button>
    </div>
  )
}
