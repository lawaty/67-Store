/**
 * GET/POST /api/payments/fake/[reference] reads or confirms a fake payment by
 * reference. Fake rails exist for development only and are unreachable unless
 * the store is explicitly running in fake payment mode.
 */
import { getContainer } from "@/api/container"
import { confirmFakePayment, readFakePayment } from "@/api/payments"
import { failure, json } from "@/api/http"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
): Promise<Response> {
  if (!getContainer().fakeRailsEnabled()) return failure("not_found", 404)

  const { reference } = await context.params
  const view = await readFakePayment(getContainer(), reference)
  if (view === null) return failure("not_found", 404)
  return json({ amount: view.amount, provider: view.provider, purpose: view.purpose })
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
): Promise<Response> {
  if (!getContainer().fakeRailsEnabled()) return failure("not_found", 404)

  const { reference } = await context.params
  const result = await confirmFakePayment(getContainer(), reference, getContainer().fakeFulfilmentEnabled())
  return result.ok ? json({ ok: true, redirectUrl: result.redirectUrl }) : failure("not_found", 400)
}
