export const LEVEL_ICONS = ["shield", "gem", "flame", "sparkles", "bolt", "coins", "gift", "tag"] as const
export type LevelIcon = (typeof LEVEL_ICONS)[number]

export const LEVEL_COLORS = ["sky", "jade", "gold", "ember"] as const
export type LevelColor = (typeof LEVEL_COLORS)[number]
