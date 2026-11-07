/**
 * `POST /api/admin/promos/[id]` — toggles a promo's active state by ID;
 * requires the admin cookie.
 */
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { togglePromo } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const { id } = await context.params
  await togglePromo(getContainer(), id, body.active === true || body.active === "true")
  return json({ ok: true })
}
