/**
 * Reads and writes markup settings. Pricing resolves a base markup per game
 * (with legacy tier fallback) unless overridden by a per-client override or VIP
 * curve.
 */
import { SettingsRepository } from "@/shared/settings-repository"
import { markup, Markup } from "../domain/pricing"
import {
  MarkupCurve,
  resolveMarkupBasisPoints,
} from "../domain/vip-markup"
import {
  DEFAULT_LEVELS,
  LEVEL_COLORS,
  LEVEL_ICONS,
  defaultLevelsFor,
  levelsToCurve,
  validateLevels,
  type Level,
  type LevelSet,
} from "../domain/level"
export const DEFAULT_MARKUP_BASIS_POINTS = 2000

export function markupBaseKey(game: string): string {
  return `markup:base:${game}`
}

function parseBasisPoints(raw: string | null): number | null {
  if (raw === null) return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

export async function readBaseMarkup(settings: SettingsRepository, game: string): Promise<Markup> {
  const base = parseBasisPoints(await settings.get(markupBaseKey(game)))
  if (base !== null) return markup(base)
  const legacy = parseBasisPoints(await settings.get(`markup:topup_client:${game}`))
  if (legacy !== null) return markup(legacy)
  return markup(DEFAULT_MARKUP_BASIS_POINTS)
}

export function vipMarkupKey(game: string): string {
  return `markup:vip:${game}`
}

export function parseVipLevels(raw: string | null | undefined): LevelSet | null {
  if (raw === null || raw === undefined) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null
  }
  const obj = parsed as Record<string, unknown>
  if (Array.isArray(obj.levels)) {
    const levels: Level[] = []
    for (const item of obj.levels) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null
      }
      const rec = item as Record<string, unknown>
      if (
        typeof rec.key !== "string" ||
        typeof rec.coins !== "number" ||
        typeof rec.basisPoints !== "number" ||
        typeof rec.title !== "string" ||
        typeof rec.icon !== "string" ||
        typeof rec.color !== "string"
      ) {
        return null
      }
      if (!(LEVEL_ICONS as readonly string[]).includes(rec.icon)) {
        return null
      }
      if (!(LEVEL_COLORS as readonly string[]).includes(rec.color)) {
        return null
      }
      levels.push({
        key: rec.key,
        coins: rec.coins,
        basisPoints: rec.basisPoints,
        title: rec.title,
        icon: rec.icon as Level["icon"],
        color: rec.color as Level["color"],
      })
    }
    try {
      validateLevels(levels)
    } catch {
      return null
    }
    return levels
  }
  if (Array.isArray(obj.breakpoints)) {
    const levels: Level[] = []
    for (let i = 0; i < obj.breakpoints.length; i++) {
      const item = obj.breakpoints[i]
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null
      }
      const rec = item as Record<string, unknown>
      if (typeof rec.coins !== "number" || typeof rec.basisPoints !== "number") {
        return null
      }
      levels.push({
        key: `level_${i}`,
        coins: rec.coins,
        basisPoints: rec.basisPoints,
        title: DEFAULT_LEVELS[i]?.title ?? `Level ${i + 1}`,
        icon: (DEFAULT_LEVELS[i]?.icon ?? "sparkles") as Level["icon"],
        color: (DEFAULT_LEVELS[i]?.color ?? "sky") as Level["color"],
      })
    }
    try {
      validateLevels(levels)
    } catch {
      return null
    }
    return levels
  }
  return null
}

export async function readVipLevels(settings: SettingsRepository, game: string): Promise<LevelSet> {
  const raw = await settings.get(vipMarkupKey(game))
  const parsed = parseVipLevels(raw)
  if (parsed !== null) {
    return parsed
  }
  return defaultLevelsFor((await readBaseMarkup(settings, game)).basisPoints)
}

export async function saveVipLevels(
  settings: SettingsRepository,
  game: string,
  levels: LevelSet,
): Promise<void> {
  validateLevels(levels)
  await settings.set(vipMarkupKey(game), JSON.stringify({ levels }))
}

export function parseVipMarkupCurve(raw: string | null | undefined): MarkupCurve | null {
  const levels = parseVipLevels(raw)
  return levels === null ? null : levelsToCurve(levels)
}

export async function readVipMarkupCurve(
  settings: SettingsRepository,
  game: string,
): Promise<MarkupCurve> {
  return levelsToCurve(await readVipLevels(settings, game))
}

export function markupOverrideKey(clientId: string): string {
  return `markup:override:${clientId}`
}

export type MarkupOverride = {
  readonly basisPoints: number
  readonly note?: string
  readonly updatedAt: string
}

export function parseMarkupOverride(raw: string | null | undefined): MarkupOverride | null {
  if (raw === null || raw === undefined) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null
  }
  const basisPoints = (parsed as { basisPoints?: unknown }).basisPoints
  if (typeof basisPoints !== "number" || !Number.isInteger(basisPoints) || basisPoints < 0) {
    return null
  }
  const updatedAt = (parsed as { updatedAt?: unknown }).updatedAt
  if (typeof updatedAt !== "string") {
    return null
  }
  const note = (parsed as { note?: unknown }).note
  if (note !== undefined && typeof note !== "string") {
    return null
  }
  const result: MarkupOverride = { basisPoints, updatedAt }
  if (note !== undefined) {
    return { ...result, note }
  }
  return result
}

export async function readMarkupOverride(
  settings: SettingsRepository,
  clientId: string,
): Promise<MarkupOverride | null> {
  const raw = await settings.get(markupOverrideKey(clientId))
  return parseMarkupOverride(raw)
}

export async function resolveClientMarkup(
  settings: SettingsRepository,
  game: string,
  input: { clientId: string | null; coinsConsumed: number },
): Promise<number> {
  let coinsConsumed = input.coinsConsumed
  if (!Number.isFinite(coinsConsumed) || coinsConsumed < 0) {
    coinsConsumed = 0
  }

  if (input.clientId !== null) {
    const override = await readMarkupOverride(settings, input.clientId)
    if (override !== null) {
      return override.basisPoints
    }
  }

  const curve = await readVipMarkupCurve(settings, game)
  if (curve !== null) {
    return resolveMarkupBasisPoints(curve, coinsConsumed)
  }

  const base = await readBaseMarkup(settings, game)
  return base.basisPoints
}
