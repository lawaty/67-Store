/**
 * Standardises HTTP JSON responses for API routes.
 * `json` wraps payloads with a status, and `failure` emits a consistent `{ error }` shape.
 */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}
export function failure(code: string, status: number): Response {
  return json({ error: code }, status)
}
