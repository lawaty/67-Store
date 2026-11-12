import { gamingProfile } from "./gaming-profile"

import { describe, expect, it } from "vitest"

describe("gamingProfile", () => {
  it("builds a profile", () => {
    const result = gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb" })
    expect(result).toEqual({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb", playerName: null, createdAt: null })
  })

  it("trims every field", () => {
    const result = gamingProfile({ id: " id1 ", clientId: " client1 ", accountId: " acc1 ", userId: " u1 ", serverId: " s1 ", game: " mlbb " })
    expect(result).toEqual({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb", playerName: null, createdAt: null })
  })

  it("throws RangeError for blank clientId, userId and serverId", () => {
    expect(() => gamingProfile({ id: "id1", clientId: " ", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb" })).toThrow(RangeError)
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: " ", serverId: "s1", game: "mlbb" })).toThrow(RangeError)
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: " ", game: "mlbb" })).toThrow(RangeError)
  })

  it("allows null/blank accountId and normalizes it to null", () => {
    expect(gamingProfile({ id: "id1", clientId: "client1", accountId: null, userId: "u1", serverId: "s1", game: "mlbb" }).accountId).toBeNull()
    expect(gamingProfile({ id: "id1", clientId: "client1", accountId: " ", userId: "u1", serverId: "s1", game: "mlbb" }).accountId).toBeNull()
    expect(gamingProfile({ id: "id1", clientId: "client1", userId: "u1", serverId: "s1", game: "mlbb" }).accountId).toBeNull()
  })

  it("throws RangeError for blank game", () => {
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: " " })).toThrow(RangeError)
  })

  it("trims the game", () => {
    const result = gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: " mlbb " })
    expect(result.game).toBe("mlbb")
  })

  it("returns a frozen object", () => {
    const result = gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb" })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it("trims and keeps the verified player name", () => {
    const result = gamingProfile({
      id: "id1",
      clientId: "client1",
      accountId: "acc1",
      userId: "u1",
      serverId: "s1",
      game: "mlbb",
      playerName: "  Dragon  ",
    })

    expect(result.playerName).toBe("Dragon")
  })

  it("passes through a createdAt string", () => {
    const result = gamingProfile({
      id: "id1",
      clientId: "client1",
      accountId: "acc1",
      userId: "u1",
      serverId: "s1",
      game: "mlbb",
      createdAt: "2026-01-02T03:04:05.000Z",
    })

    expect(result.createdAt).toBe("2026-01-02T03:04:05.000Z")
  })

  it("normalizes a createdAt Date to an ISO string", () => {
    const result = gamingProfile({
      id: "id1",
      clientId: "client1",
      accountId: "acc1",
      userId: "u1",
      serverId: "s1",
      game: "mlbb",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
    })

    expect(result.createdAt).toBe("2026-01-02T03:04:05.000Z")
  })

  it("normalizes absent, null, and empty createdAt to null", () => {
    expect(gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb" }).createdAt).toBeNull()
    expect(gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb", createdAt: null }).createdAt).toBeNull()
    expect(gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb", createdAt: "" }).createdAt).toBeNull()
  })

  it("still throws RangeError for empty required fields", () => {
    expect(() => gamingProfile({ id: "id1", clientId: "", accountId: "acc1", userId: "u1", serverId: "s1", game: "mlbb" })).toThrow(RangeError)
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "", serverId: "s1", game: "mlbb" })).toThrow(RangeError)
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "", game: "mlbb" })).toThrow(RangeError)
    expect(() => gamingProfile({ id: "id1", clientId: "client1", accountId: "acc1", userId: "u1", serverId: "s1", game: "" })).toThrow(RangeError)
  })
})
