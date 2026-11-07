import { describe, expect, it, vi } from "vitest"
import { ApiError, createApiClient } from "./api"

describe("frontend api", () => {
  it("GET returns parsed body and sends cookie header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as any)
    const client = createApiClient({ origin: "http://example.com", cookie: "a=b", fetchImpl })
    const res = await client.get<{ ok: boolean }>("/test")
    expect(res).toEqual({ ok: true })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("http://example.com/test")
    expect((init as any).headers["cookie"]).toBe("a=b")
  })

  it("GET sends cache:no-store", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as any)
    const client = createApiClient({ origin: "http://example.com", cookie: "", fetchImpl })
    await client.get("/test")
    const [, init] = fetchImpl.mock.calls[0]
    expect((init as any).cache).toBe("no-store")
  })

  it("POST serializes body and uses POST", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    } as any)
    const client = createApiClient({ origin: "http://example.com", cookie: "x=y", fetchImpl })
    const res = await client.post<{ id: number }>("/items", { name: "x" })
    expect(res).toEqual({ id: 1 })
    const [, init] = fetchImpl.mock.calls[0]
    expect((init as any).method).toBe("POST")
    expect((init as any).body).toBe(JSON.stringify({ name: "x" }))
  })

  it("400 {error:\"bad\"} throws ApiError status 400 code \"bad\"", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "bad" }),
    } as any)
    const client = createApiClient({ origin: "http://example.com", cookie: "", fetchImpl })
    await expect(client.get("/bad")).rejects.toBeInstanceOf(ApiError)
    try {
      await client.get("/bad")
    } catch (e: any) {
      expect(e.status).toBe(400)
      expect(e.code).toBe("bad")
      expect(e.name).toBe("ApiError")
    }
  })

  it("DELETE uses DELETE", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as any)
    const client = createApiClient({ origin: "http://example.com", cookie: "", fetchImpl })
    await client.delete("/item/1")
    const [, init] = fetchImpl.mock.calls[0]
    expect((init as any).method).toBe("DELETE")
  })
})
