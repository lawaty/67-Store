/**
 * `DELETE /api/admin/funding/[id]` — guarded rollback of a funding lot;
 * requires the admin cookie via `isAdminRequest`.
 */
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { rollbackFunding } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const { id } = await context.params
  const result = await rollbackFunding(getContainer(), id)

  if (result.ok) return json({ ok: true })
  if (result.error === "not_found") return failure("not_found", 404)
  if (result.error === "locked") return failure("locked", 409)
  return failure(result.error, 400)
}
