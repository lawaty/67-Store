/**
 * `GET /api/admin/users/[id]` — returns a single user by id; requires the admin
 * cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readUser } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const { id } = await context.params
  const user = await readUser(getContainer(), id)
  return user === null ? failure("not_found", 404) : json(user)
}
