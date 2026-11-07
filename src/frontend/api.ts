/**
 * JSON API client and error type used by server-side frontend loaders to call
 * the backend with forwarded cookies.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(code)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export type ApiClient = {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

export function createApiClient(options: { origin: string; cookie: string; fetchImpl?: typeof fetch }): ApiClient {
  const fetchImpl = options.fetchImpl ?? fetch
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (options.cookie !== "") headers.cookie = options.cookie
    const response = await fetchImpl(new URL(path, options.origin).toString(), { ...init, cache: "no-store", headers })
    const body = (await response.json().catch(() => ({}))) as { error?: string } & T
    if (!response.ok) throw new ApiError(response.status, body.error ?? "error")
    return body as T
  }
  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
    delete: (path) => request(path, { method: "DELETE" }),
  }
}
