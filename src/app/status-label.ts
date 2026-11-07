/**
 * Maps order status to a localized label and a badge CSS class for display.
 */
import type { OrderStatusDto } from "@/api/contracts"
import type { Locale } from "@/i18n/locale"

const labelsAr: Record<OrderStatusDto, string> = {
  CREATED: "اتنشأ",
  AWAITING_PAYMENT: "مستني الدفع",
  PAID: "اتدفع",
  FULFILLING: "بيتنفذ",
  DELIVERED: "تم التسليم",
  FAILED: "فشل",
  EXPIRED: "خلصت صلاحيته",
  REFUNDED: "تم الاسترجاع",
}

const labelsEn: Record<OrderStatusDto, string> = {
  CREATED: "Created",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Payment confirmed",
  FULFILLING: "Fulfilling",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
}

export function statusLabel(status: OrderStatusDto, locale: Locale = "ar"): string {
  return locale === "en" ? labelsEn[status] : labelsAr[status]
}

export function statusClass(status: OrderStatusDto): string {
  return `badge badge-${status.toLowerCase()}`
}
