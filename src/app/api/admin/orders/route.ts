/**
 * `GET /api/admin/orders` — searches orders by status, date range, and query
 * with pagination; requires the admin cookie.
 */
import type { OrderStatusDto } from "@/api/contracts/order"
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { searchOrders } from "@/api/admin"
import { failure, json } from "@/api/http"

const STATUSES: readonly OrderStatusDto[] = [
  "CREATED",
  "AWAITING_PAYMENT",
  "PAID",
  "FULFILLING",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]

function statusOf(value: string | null): OrderStatusDto | null {
  return value !== null && (STATUSES as readonly string[]).includes(value) ? (value as OrderStatusDto) : null
}

function pageOf(value: string | null): number {
  const parsed = Number(value ?? "1")
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const url = new URL(request.url)
  const page = pageOf(url.searchParams.get("page"))
  const take = 50
  const skip = (page - 1) * take

  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const q = url.searchParams.get("q")

  return json(
    await searchOrders(getContainer(), {
      status: statusOf(url.searchParams.get("status")),
      from: from !== null && from.trim() !== "" ? from.trim() : null,
      to: to !== null && to.trim() !== "" ? to.trim() : null,
      q: q !== null && q.trim() !== "" ? q.trim() : null,
      skip,
      take,
    }),
  )
}
