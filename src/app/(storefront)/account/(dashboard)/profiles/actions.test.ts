/**
 * Tests the profile server actions in /account/profiles:
 * removeProfile redirects with removal feedback and savePlayerPreference
 * persists the preferred player and revalidates account/profile views.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/frontend/api"

const { post, get, del, redirect, revalidatePath } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error("redirect:" + url)
  }),
  revalidatePath: vi.fn(),
}))

vi.mock("@/frontend/server", () => ({
  serverApi: async () => ({ post, get, delete: del }),
}))

vi.mock("next/navigation", () => ({ redirect }))

vi.mock("next/cache", () => ({ revalidatePath }))

import { removeProfile, savePlayerPreference } from "./actions"

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

describe("profiles actions", () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    del.mockReset()
    redirect.mockClear()
    revalidatePath.mockClear()
  })

  it("removeProfile revalidates and redirects with removed feedback", async () => {
    del.mockResolvedValueOnce({})

    await expect(removeProfile(form({ profileId: "p-1" }))).rejects.toThrow("redirect:/account/profiles?removed=1")

    expect(del).toHaveBeenCalledWith("/api/account/profiles?id=p-1")
    expect(revalidatePath).toHaveBeenCalledWith("/account")
    expect(revalidatePath).toHaveBeenCalledWith("/account/profiles")
  })

  it("removeProfile redirects to login on 401", async () => {
    del.mockRejectedValueOnce(new ApiError(401, "unauthorized"))

    await expect(removeProfile(form({ profileId: "p-1" }))).rejects.toThrow("redirect:/account/login")
  })

  it("savePlayerPreference posts preference, revalidates, and redirects to profiles", async () => {
    post.mockResolvedValueOnce({})

    await expect(savePlayerPreference(form({ userId: "123", serverId: "4567" }))).rejects.toThrow(
      "redirect:/account/profiles",
    )

    expect(post).toHaveBeenCalledWith("/api/account/preference", { userId: "123", serverId: "4567" })
    expect(revalidatePath).toHaveBeenCalledWith("/account")
    expect(revalidatePath).toHaveBeenCalledWith("/account/profiles")
  })

  it("savePlayerPreference redirects to login on 401", async () => {
    post.mockRejectedValueOnce(new ApiError(401, "unauthorized"))

    await expect(savePlayerPreference(form({ userId: "123", serverId: "4567" }))).rejects.toThrow(
      "redirect:/account/login",
    )
  })
})
