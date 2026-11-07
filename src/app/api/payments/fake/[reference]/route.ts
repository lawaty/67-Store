/**
 * GET/POST /api/payments/fake/[reference] reads or confirms a fake payment by
 * reference. Available only in sandbox operations mode; returns 404/400 otherwise.
 */
import { getContainer } from "@/api/container"
import { confirmFakePayment, readFakePayment } from "@/api/payments"
import { failure, json } from "@/api/http"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
): Promise<Response> {
  if ((await getContainer().operationsMode()) !== "sandbox") return failure("not_found", 404)

  const { reference } = await context.params
  const view = await readFakePayment(getContainer(), reference)
  if (view === null) return failure("not_found", 404)
  return json({ amount: view.amount, provider: view.provider, purpose: view.purpose })
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
): Promise<Response> {
  if ((await getContainer().operationsMode()) !== "sandbox") return failure("disabled", 400)

  const { reference } = await context.params
  const result = await confirmFakePayment(getContainer(), reference, true)
  return result.ok ? json({ ok: true, redirectUrl: result.redirectUrl }) : failure("not_found", 400)
}
