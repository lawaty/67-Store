/**
 * `GET /api/admin/users` — lists users with page-based pagination; requires the
 * admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { listUsers } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const raw = new URL(request.url).searchParams.get("page")
  const parsed = Number(raw ?? "1")
  const page = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
  const take = 20
  const skip = (page - 1) * take

  return json(await listUsers(getContainer(), skip, take))
}
