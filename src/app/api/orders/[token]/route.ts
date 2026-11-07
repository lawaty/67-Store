/**
 * GET /api/orders/[token] reads an order by its public token. No account auth;
 * returns the order JSON or 404 if not found.
 */
import { getContainer } from "@/api/container"
import { readOrder } from "@/api/orders"
import { failure, json } from "@/api/http"

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params
  const order = await readOrder(getContainer(), token)
  return order === null ? failure("not_found", 404) : json(order)
}
