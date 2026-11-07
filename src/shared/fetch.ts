/**
 * Injectable fetch type used so adapters can be tested without real HTTP.
 */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>
