/**
 * `POST/DELETE /api/admin/users/[id]/markup-override` — sets or clears the
 * per-client markup override (the path `id` is the account id); requires the
 * admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { clearMarkupOverride, saveMarkupOverride } from "@/api/admin"
import { failure, json } from "@/api/http"

async function clientIdForAccount(accountId: string): Promise<string | null> {
  const account = await getContainer().accounts.findById(accountId)
  return account?.clientId ?? null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const { id } = await context.params
  const clientId = await clientIdForAccount(id)
  if (clientId === null) return failure("not_found", 404)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const result = await saveMarkupOverride(getContainer(), {
    clientId,
    markupPercent: Number(body.markupPercent),
    note: typeof body.note === "string" ? body.note : undefined,
  })

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const { id } = await context.params
  const clientId = await clientIdForAccount(id)
  if (clientId === null) return failure("not_found", 404)

  const result = await clearMarkupOverride(getContainer(), clientId)

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}
