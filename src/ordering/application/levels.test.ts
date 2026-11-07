import { describe, expect, it, vi } from "vitest"
import { DEFAULT_LEVELS } from "../domain/level"
import { recordLevelAchievements } from "./levels"
import type { EarnedLevel } from "../ports/level-achievement-repository"

const now = new Date("2026-11-06T00:00:00.000Z")
const fixedList: readonly EarnedLevel[] = [
  { levelKey: "epic", coins: 0, title: "Epic", icon: "shield", color: "sky", earnedAt: "2026-11-06T00:00:00.000Z" },
]

function makeDeps(list: readonly EarnedLevel[] = fixedList) {
  const earn = vi.fn(async (_input: unknown) => {})
  const listByClient = vi.fn(async (_clientId: string) => list as EarnedLevel[])
  return { earn, listByClient }
}

describe("recordLevelAchievements", () => {
  it("volume 0 earns only epic", async () => {
    const deps = makeDeps()
    await recordLevelAchievements(deps, "c1", DEFAULT_LEVELS, 0, now)
    expect(deps.earn).toHaveBeenCalledTimes(1)
    expect(deps.earn).toHaveBeenCalledWith({
      clientId: "c1",
      levelKey: "epic",
      coins: 0,
      title: "Epic",
      icon: "shield",
      color: "sky",
      earnedAt: now.toISOString(),
    })
    expect(deps.listByClient).toHaveBeenCalledWith("c1")
  })

  it("1000 earns epic then mythic", async () => {
    const deps = makeDeps()
    await recordLevelAchievements(deps, "c1", DEFAULT_LEVELS, 1000, now)
    expect(deps.earn).toHaveBeenCalledTimes(2)
    expect(deps.earn.mock.calls.map((c) => (c[0] as { levelKey: string }).levelKey)).toEqual(["epic", "mythic"])
    expect(deps.earn.mock.calls[0][0]).toEqual({
      clientId: "c1",
      levelKey: "epic",
      coins: 0,
      title: "Epic",
      icon: "shield",
      color: "sky",
      earnedAt: now.toISOString(),
    })
    expect(deps.earn.mock.calls[1][0]).toEqual({
      clientId: "c1",
      levelKey: "mythic",
      coins: 1000,
      title: "Mythic",
      icon: "gem",
      color: "gold",
      earnedAt: now.toISOString(),
    })
  })

  it("5000 earns all three in order", async () => {
    const deps = makeDeps()
    await recordLevelAchievements(deps, "c1", DEFAULT_LEVELS, 5000, now)
    expect(deps.earn).toHaveBeenCalledTimes(3)
    expect(deps.earn.mock.calls.map((c) => (c[0] as { levelKey: string }).levelKey)).toEqual([
      "epic",
      "mythic",
      "immortal",
    ])
  })

  it("-5 and NaN earn only epic", async () => {
    const depsNeg = makeDeps()
    await recordLevelAchievements(depsNeg, "c1", DEFAULT_LEVELS, -5, now)
    expect(depsNeg.earn).toHaveBeenCalledTimes(1)
    expect(depsNeg.earn.mock.calls[0][0]).toMatchObject({ levelKey: "epic" })

    const depsNan = makeDeps()
    await recordLevelAchievements(depsNan, "c1", DEFAULT_LEVELS, Number.NaN, now)
    expect(depsNan.earn).toHaveBeenCalledTimes(1)
    expect(depsNan.earn.mock.calls[0][0]).toMatchObject({ levelKey: "epic" })

    const depsInf = makeDeps()
    await recordLevelAchievements(depsInf, "c1", DEFAULT_LEVELS, Number.POSITIVE_INFINITY, now)
    expect(depsInf.earn).toHaveBeenCalledTimes(1)
    expect(depsInf.earn.mock.calls[0][0]).toMatchObject({ levelKey: "epic" })
  })

  it("earnedAt equals now.toISOString()", async () => {
    const deps = makeDeps()
    await recordLevelAchievements(deps, "c1", DEFAULT_LEVELS, 5000, now)
    for (const call of deps.earn.mock.calls) {
      expect((call[0] as { earnedAt: string }).earnedAt).toBe(now.toISOString())
    }
  })

  it("returned value is exactly what listByClient returns", async () => {
    const list = fixedList
    const deps = makeDeps(list)
    const result = await recordLevelAchievements(deps, "c1", DEFAULT_LEVELS, 0, now)
    expect(result).toBe(list)
    expect(deps.listByClient).toHaveBeenCalledWith("c1")
  })

  it("invalid levels throw and no earn call happens", async () => {
    const deps = makeDeps()
    await expect(recordLevelAchievements(deps, "c1", [] as never, 0, now)).rejects.toBeInstanceOf(RangeError)
    expect(deps.earn).not.toHaveBeenCalled()
    expect(deps.listByClient).not.toHaveBeenCalled()
  })
})
