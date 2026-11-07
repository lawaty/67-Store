import { describe, it, expect, beforeEach } from "vitest"
import { signSession } from "@/accounts"
import { adminToken } from "@/backoffice"
import { sessionFromRequest, isAdminRequest } from "./auth"

describe("auth", () => {
  beforeEach(() => {
    process.env.G2BULK_API_KEY = "test"
    process.env.AUTH_SECRET = "secret"
    process.env.ADMIN_PASSWORD = "admin"
  })

  it("valid session returns ids", () => {
    const token = signSession({ accountId: "a1", clientId: "c1", expiresAt: Date.now() + 60000 }, "secret")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `session=${token}` }
    })
    const session = sessionFromRequest(request)
    expect(session).toEqual({ accountId: "a1", clientId: "c1" })
  })

  it("garbage token returns null", () => {
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: "session=garbage" }
    })
    const session = sessionFromRequest(request)
    expect(session).toBeNull()
  })

  it("missing cookie returns null", () => {
    const request = new Request("http://localhost/api/x")
    const session = sessionFromRequest(request)
    expect(session).toBeNull()
  })

  it("empty AUTH_SECRET returns null", () => {
    process.env.AUTH_SECRET = ""
    const token = signSession({ accountId: "a1", clientId: "c1", expiresAt: Date.now() + 60000 }, "secret")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `session=${token}` }
    })
    const session = sessionFromRequest(request)
    expect(session).toBeNull()
  })

  it("expired token returns null", () => {
    const token = signSession({ accountId: "a1", clientId: "c1", expiresAt: Date.now() - 60000 }, "secret")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `session=${token}` }
    })
    const session = sessionFromRequest(request)
    expect(session).toBeNull()
  })

  it("valid admin cookie returns true", () => {
    const token = adminToken("admin")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `admin_session=${token}` }
    })
    const isAdmin = isAdminRequest(request)
    expect(isAdmin).toBe(true)
  })

  it("wrong admin returns false", () => {
    const token = adminToken("wrong")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `admin_session=${token}` }
    })
    const isAdmin = isAdminRequest(request)
    expect(isAdmin).toBe(false)
  })

  it("no admin cookie returns false", () => {
    const request = new Request("http://localhost/api/x")
    const isAdmin = isAdminRequest(request)
    expect(isAdmin).toBe(false)
  })

  it("empty admin cookie returns false", () => {
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: "admin_session=" }
    })
    const isAdmin = isAdminRequest(request)
    expect(isAdmin).toBe(false)
  })

  it("empty ADMIN_PASSWORD returns false", () => {
    process.env.ADMIN_PASSWORD = ""
    const token = adminToken("admin")
    const request = new Request("http://localhost/api/x", {
      headers: { cookie: `admin_session=${token}` }
    })
    const isAdmin = isAdminRequest(request)
    expect(isAdmin).toBe(false)
  })
})