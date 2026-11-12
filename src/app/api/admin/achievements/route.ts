/**
 * `GET/POST /api/admin/achievements` — lists or creates achievements; requires the admin cookie.
 */

import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { createAchievement, listAchievements } from "@/api/admin"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function isAchievementType(value: unknown): value is "TOTAL_ORDERS" | "ORDERS_PER_MONTH" | "ORDERS_PER_WEEK" {
  return value === "TOTAL_ORDERS" || value === "ORDERS_PER_MONTH" || value === "ORDERS_PER_WEEK"
}

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await listAchievements(getContainer()))
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  if (!isAchievementType(body.type)) return failure("invalid", 400)
  const target = Number(body.target)
  if (!Number.isInteger(target) || target <= 0) return failure("invalid", 400)
  if (typeof body.title !== "string" || typeof body.description !== "string" || typeof body.icon !== "string" || typeof body.color !== "string") {
    return failure("invalid", 400)
  }
  if (typeof body.active !== "boolean") return failure("invalid", 400)
  if (typeof body.sortOrder !== "number" || !Number.isFinite(body.sortOrder)) return failure("invalid", 400)

  try {
    const created = await createAchievement(
      getContainer(),
      {
        title: body.title,
        description: body.description,
        icon: body.icon,
        color: body.color,
        type: body.type,
        target,
        active: body.active,
        sortOrder: body.sortOrder,
      },
      randomUUID,
    )
    return json(created)
  } catch (error) {
    if (error instanceof RangeError) return failure("invalid", 400)
    throw error
  }
}