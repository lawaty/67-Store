import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { checkPlayer, PlayerCheckUnavailableError } from "./players"

function fakeContainer(overrides: Partial<Container> = {}): Container {
  return {
    distributor: {
      checkPlayer: async () => ({ valid: true, name: "Player" }),
      placeOrder: async () => {
        throw new Error("not used")
      },
      getOrder: async () => {
        throw new Error("not used")
      },
      getBalance: async () => ({ balanceMinor: 0 }),
    },
    ...overrides,
  } as unknown as Container
}

describe("checkPlayer", () => {
  it("returns the distributor result for a valid player", async () => {
    const checkPlayerMock = vi.fn(async () => ({ valid: true, name: "Player" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: checkPlayerMock,
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    const result = await checkPlayer(container, { game: "mlbb", userId: "123", serverId: "456" })

    expect(result).toEqual({ valid: true, name: "Player" })
    expect(checkPlayerMock).toHaveBeenCalledWith({
      game: "mlbb",
      player: { userId: "123", serverId: "456" },
    })
  })

  it("returns the distributor result for an invalid player", async () => {
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: false, name: null }),
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    const result = await checkPlayer(container, { game: "mlbb", userId: "123", serverId: "456" })

    expect(result).toEqual({ valid: false, name: null })
  })

  it("throws RangeError for a blank userId without calling the distributor", async () => {
    const checkPlayerMock = vi.fn(async () => ({ valid: true, name: "Player" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: checkPlayerMock,
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    await expect(
      checkPlayer(container, { game: "mlbb", userId: "   ", serverId: "456" }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(checkPlayerMock).not.toHaveBeenCalled()
  })

  it("throws RangeError for a blank serverId without calling the distributor", async () => {
    const checkPlayerMock = vi.fn(async () => ({ valid: true, name: "Player" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: checkPlayerMock,
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    await expect(
      checkPlayer(container, { game: "mlbb", userId: "123", serverId: "" }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(checkPlayerMock).not.toHaveBeenCalled()
  })

  it("throws PlayerCheckUnavailableError when the distributor throws", async () => {
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => {
          throw new Error("distributor down")
        },
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    await expect(
      checkPlayer(container, { game: "mlbb", userId: "123", serverId: "456" }),
    ).rejects.toBeInstanceOf(PlayerCheckUnavailableError)
  })

  it("defaults a blank game to mlbb", async () => {
    const checkPlayerMock = vi.fn(async () => ({ valid: true, name: "Player" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: checkPlayerMock,
        placeOrder: async () => {
          throw new Error("not used")
        },
        getOrder: async () => {
          throw new Error("not used")
        },
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    await checkPlayer(container, { game: "   ", userId: "123", serverId: "456" })

    expect(checkPlayerMock).toHaveBeenCalledWith({
      game: "mlbb",
      player: { userId: "123", serverId: "456" },
    })
  })
})
