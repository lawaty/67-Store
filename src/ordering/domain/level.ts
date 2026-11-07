import { LEVEL_COLORS, LEVEL_ICONS, type LevelColor, type LevelIcon } from "@/shared/level-badge"
import { MarkupCurve } from "./vip-markup"

export { LEVEL_COLORS, LEVEL_ICONS }
export type { LevelColor, LevelIcon }

export type Level = {
  readonly key: string
  readonly coins: number
  readonly basisPoints: number
  readonly title: string
  readonly icon: LevelIcon
  readonly color: LevelColor
}

export type LevelSet = readonly Level[]

export const DEFAULT_LEVELS: LevelSet = [
  { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
  { key: "mythic", coins: 1000, basisPoints: 1500, title: "Mythic", icon: "gem", color: "gold" },
  { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
]

export function defaultLevelsFor(baseBasisPoints: number): LevelSet {
  if (!Number.isSafeInteger(baseBasisPoints) || baseBasisPoints < 0) {
    throw new RangeError("baseBasisPoints must be a safe integer >= 0")
  }
  return DEFAULT_LEVELS.map((level, i) => ({
    key: level.key,
    coins: level.coins,
    basisPoints: i === 0 ? baseBasisPoints : Math.max(0, baseBasisPoints - i * 500),
    title: level.title,
    icon: level.icon,
    color: level.color,
  }))
}

export function validateLevels(levels: readonly Level[]): void {
  if (!Array.isArray(levels)) {
    throw new RangeError("levels must be an array")
  }
  if (levels.length < 2) {
    throw new RangeError("levels requires at least 2 levels")
  }
  const keyPattern = /^[a-z0-9][a-z0-9_-]{0,39}$/
  const seenKeys = new Set<string>()
  let prevCoins: number | null = null
  let prevBasisPoints: number | null = null
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    if (!level || typeof level !== "object") {
      throw new RangeError("level must be an object")
    }
    if (typeof level.key !== "string") {
      throw new RangeError("level key must be a string")
    }
    if (level.key !== level.key.trim()) {
      throw new RangeError("level key must not have leading or trailing spaces")
    }
    if (!keyPattern.test(level.key)) {
      throw new RangeError("level key must match /^[a-z0-9][a-z0-9_-]{0,39}$/")
    }
    if (seenKeys.has(level.key)) {
      throw new RangeError("level key must be unique")
    }
    seenKeys.add(level.key)
    if (typeof level.title !== "string") {
      throw new RangeError("level title must be a string")
    }
    const trimmedTitle = level.title.trim()
    if (trimmedTitle.length === 0) {
      throw new RangeError("level title must be non-empty")
    }
    if (trimmedTitle.length > 40) {
      throw new RangeError("level title must be at most 40 characters")
    }
    if (!(LEVEL_ICONS as readonly string[]).includes(level.icon)) {
      throw new RangeError("level icon must be one of LEVEL_ICONS")
    }
    if (!(LEVEL_COLORS as readonly string[]).includes(level.color)) {
      throw new RangeError("level color must be one of LEVEL_COLORS")
    }
    if (!Number.isSafeInteger(level.coins) || level.coins < 0) {
      throw new RangeError("level coins must be a non-negative safe integer")
    }
    if (i === 0 && level.coins !== 0) {
      throw new RangeError("first level coins must be 0")
    }
    if (prevCoins !== null && !(level.coins > prevCoins)) {
      throw new RangeError("level coins must be strictly increasing")
    }
    if (!Number.isSafeInteger(level.basisPoints) || level.basisPoints < 0) {
      throw new RangeError("level basisPoints must be a non-negative safe integer")
    }
    if (prevBasisPoints !== null && level.basisPoints > prevBasisPoints) {
      throw new RangeError("level basisPoints must not increase")
    }
    prevCoins = level.coins
    prevBasisPoints = level.basisPoints
  }
}

export function levelsToCurve(levels: LevelSet): MarkupCurve {
  validateLevels(levels)
  return levels.map((level) => ({ coins: level.coins, basisPoints: level.basisPoints }))
}

function sanitizeVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0
  }
  if (volume < 0) {
    return 0
  }
  return volume
}

export function levelAt(levels: LevelSet, volume: number): Level {
  validateLevels(levels)
  const sanitizedVolume = sanitizeVolume(volume)
  let result = levels[0]
  for (const level of levels) {
    if (level.coins <= sanitizedVolume) {
      result = level
    } else {
      break
    }
  }
  return result
}

export function levelProgress(
  levels: LevelSet,
  volume: number,
): { readonly current: Level; readonly next: Level | null; readonly toNext: number; readonly percent: number } {
  validateLevels(levels)
  const sanitizedVolume = sanitizeVolume(volume)
  const current = levelAt(levels, sanitizedVolume)
  let next: Level | null = null
  for (const level of levels) {
    if (level.coins > sanitizedVolume) {
      next = level
      break
    }
  }
  if (next === null) {
    return { current, next: null, toNext: 0, percent: 100 }
  }
  const toNext = next.coins - sanitizedVolume
  const rawPercent = Math.floor(((sanitizedVolume - current.coins) * 100) / (next.coins - current.coins))
  const percent = Math.max(0, Math.min(100, rawPercent))
  return { current, next, toNext, percent }
}
