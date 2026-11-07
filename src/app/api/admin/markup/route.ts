/**
 * `POST /api/admin/markup` — saves the base markup percentage; requires the admin cookie.
 */
import { NextRequest } from "next/server"
import { json, failure } from "@/api/http"
import { isAdminRequest } from "@/api/auth"
import { saveMarkup } from "@/api/admin"
import { getContainer } from "@/api/container"

async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return failure("unauthorized", 401)
  }

  const body = await request.json()
  const markupPercent = Number(body.markupPercent)

  const result = await saveMarkup(getContainer(), { markupPercent })

  if (!result.ok) {
    return failure(result.error, 400)
  }

  return json({ ok: true })
}

export { POST }