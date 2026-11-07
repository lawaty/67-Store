/**
 * Persists the live/sandbox operations mode as a settings value. A missing or
 * malformed value never breaks the reader — callers pass the fallback they
 * want (normally the env default).
 */
import type { SettingsRepository } from "./settings-repository"

export const OPERATIONS_MODE_KEY = "operations:mode"

export type OperationsMode = "live" | "sandbox"

export const OPERATIONS_MODES: readonly OperationsMode[] = ["live", "sandbox"]

export function parseOperationsMode(raw: string | null | undefined): OperationsMode | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === "live" || trimmed === "sandbox") return trimmed
  return null
}

export async function readOperationsMode(
  settings: SettingsRepository,
  fallback: OperationsMode,
): Promise<OperationsMode> {
  const parsed = parseOperationsMode(await settings.get(OPERATIONS_MODE_KEY))
  return parsed ?? fallback
}

export async function writeOperationsMode(
  settings: SettingsRepository,
  mode: OperationsMode,
): Promise<void> {
  if (parseOperationsMode(mode) === null) {
    throw new Error("OPERATIONS_MODE must be one of live, sandbox")
  }
  await settings.set(OPERATIONS_MODE_KEY, mode)
}
