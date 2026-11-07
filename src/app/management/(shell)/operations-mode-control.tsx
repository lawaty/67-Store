/**
 * Dashboard operations-mode toggle (server component): one switch that posts
 * the opposite mode via `saveOperationsMode`.
 */

import { saveOperationsMode } from "./actions"

export function OperationsModeControl({
  mode,
  liveReady,
}: {
  readonly mode: "live" | "sandbox"
  readonly liveReady: boolean
}) {
  const next = mode === "live" ? "sandbox" : "live"

  return (
    <form action={saveOperationsMode} className="inline-flex items-center">
      <button
        type="submit"
        name="mode"
        value={next}
        role="switch"
        aria-checked={mode === "live"}
        aria-label={mode === "live" ? "وضع التشغيل: Live" : "وضع التشغيل: Sandbox"}
        title={liveReady ? undefined : "Live rails are not configured yet"}
        className={`mode-switch mode-switch--${mode}`}
      >
        <span className="mode-switch-track">
          <span className="mode-switch-knob" />
        </span>
        <span className="mode-switch-label">
          {mode === "live" ? "Live" : "Sandbox"}
          {!liveReady ? <span aria-hidden className="mode-switch-warn" /> : null}
        </span>
      </button>
    </form>
  )
}