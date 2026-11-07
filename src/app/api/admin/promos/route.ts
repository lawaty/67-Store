/**
 * `GET/POST /api/admin/promos` — lists promos (with EGP amounts) or creates a
 * new promo; requires the admin cookie.
 */
import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { createPromo, readEgpRate } from "@/api/admin"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  const c = getContainer()
  const [promos, rate] = await Promise.all([c.promos.listAll(), readEgpRate(c.settings)])
  return json(
    promos.map((promo) => ({
      id: promo.id,
      code: promo.code,
      kind: promo.kind,
      basisPoints: promo.basisPoints,
      amountMinor: promo.amountMinor,
      amountEgpMinor: promo.amountMinor === null ? null : Math.round(promo.amountMinor * rate),
      uses: promo.uses,
      maxUses: promo.maxUses,
      expiresAt: promo.expiresAt,
      active: promo.active,
    })),
  )
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const result = await createPromo(
    getContainer(),
    {
      code: text(body.code),
      kind: text(body.kind),
      value: Number(body.value),
      maxUses: text(body.maxUses),
      expiresAt: text(body.expiresAt),
    },
    randomUUID,
  )

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}
