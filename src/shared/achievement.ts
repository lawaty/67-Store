/**
 * Defines the achievement type vocabulary and its Arabic labels shared by the
 * admin achievement form and list.
 */

export type AchievementTypeValue =
  | "TOTAL_ORDERS"
  | "ORDERS_PER_MONTH"
  | "ORDERS_PER_WEEK"

export const ACHIEVEMENT_TYPES = [
  "TOTAL_ORDERS",
  "ORDERS_PER_MONTH",
  "ORDERS_PER_WEEK",
] as const satisfies readonly AchievementTypeValue[]

export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementTypeValue, string> = {
  TOTAL_ORDERS: "إجمالي الطلبات",
  ORDERS_PER_MONTH: "طلبات الشهر",
  ORDERS_PER_WEEK: "طلبات الأسبوع",
}
