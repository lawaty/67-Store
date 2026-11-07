import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { gamingProfile } from "@/accounts"
import { order, type EarnedLevel } from "@/ordering"
import { product } from '@/catalogue'
import { player } from "@/ordering"
import { money } from "@/shared/money"
import type { SettingsRepository } from "@/shared/settings-repository"
import {
  addProfile,
  InvalidPlayerError,
  listProfiles,
  PlayerVerificationError,
  readAccount,
  removeProfile,
  savePreference,
} from "./account"

const profile = gamingProfile({ id: "g1", accountId: "a1", label: "Main", userId: "1", serverId: "2", game: "mlbb" })

const placed = order({
  id: "o1",
  token: "t1",
  client: client("c1"),
  product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1000, "USD"),
  status: "PAID",
  markupBasisPoints: 0,
})

const epicBadge: EarnedLevel = {
  levelKey: "epic",
  coins: 0,
  title: "Epic",
  icon: "shield",
  color: "sky",
  earnedAt: "2026-01-01T00:00:00.000Z",
}

function fakeSettings(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    all: async () => Object.fromEntries(store),
  }
}

function fakeActivity(volume: number) {
  return { sumQualifiedVolumeSince: async () => volume }
}

function fakeLevelAchievements(persisted: readonly EarnedLevel[] = [epicBadge]) {
  return {
    earn: async () => {},
    listByClient: async () => [...persisted],
  }
}

function fakeContainer(overrides: Partial<Container> = {}): Container {
  return {
    clients: { findById: async () => client("c1"), save: async () => {} },
    orders: {
      listByClient: async () => [placed],
      save: async () => {},
      findById: async () => placed,
      findByToken: async () => placed,
      update: async () => {},
      listRecent: async () => [],
      findByDistributorOrderId: async () => null,
      listByStatus: async () => [],
      search: async () => ({ rows: [], total: 0 }),
    },
    wallets: {
      getOrCreate: async () => ({ clientId: "c1", coinBalance: 900 }),
      listEntries: async () => [
        { id: "e1", amount: 100, reason: "grant", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      credit: async () => ({ clientId: "c1", coinBalance: 0 }),
      debit: async () => true,
    },
    gamingProfiles: {
      listByAccount: async () => [profile],
      add: async () => {},
      remove: async () => {},
    },
    distributor: {
      checkPlayer: async () => ({ valid: true, name: "Player" }),
      placeOrder: async () => { throw new Error("not used") },
      getOrder: async () => { throw new Error("not used") },
      getBalance: async () => ({ balanceMinor: 0 }),
    },
    accounts: {
      setPreference: async () => {},
      findByEmail: async () => null,
      findById: async () => null,
      create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
      list: async () => ({ rows: [], total: 0 }),
      listPreferences: async () => ({}),
    },
    settings: fakeSettings(),
    activity: fakeActivity(0),
    levelAchievements: fakeLevelAchievements(),
    operationsMode: async () => "live" as const,
    ...overrides,
  } as unknown as Container
}

describe("readAccount", () => {
  it("returns orders, wallet, entries and profiles without client type", async () => {
    const account = await readAccount(fakeContainer(), { accountId: "a1", clientId: "c1" })

    expect(account).not.toBeNull()
    expect("clientType" in (account ?? {})).toBe(false)
    expect(account?.orders[0]).toEqual({
      id: "o1",
      token: "t1",
      status: "PAID",
      productName: "86",
      price: money(1000, "USD"),
      createdAt: null,
      userId: "1",
      serverId: "2",
      playerName: null,
    })
    expect(account?.wallet.coinBalance).toBe(900)
    expect(account?.entries[0]).toEqual({
      id: "e1",
      amount: 100,
      reason: "grant",
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    expect(account?.profiles[0].label).toBe("Main")
  })

  it("reports fundingAvailable false in live mode", async () => {
    const container = fakeContainer({ operationsMode: async () => "live" as const })
    const account = await readAccount(container, { accountId: "a1", clientId: "c1" })

    expect(account?.fundingAvailable).toBe(false)
  })

  it("reports fundingAvailable true in sandbox mode", async () => {
    const container = fakeContainer({ operationsMode: async () => "sandbox" as const })
    const account = await readAccount(container, { accountId: "a1", clientId: "c1" })

    expect(account?.fundingAvailable).toBe(true)
  })

  it("returns null when the client is gone", async () => {
    const container = fakeContainer({
      clients: { findById: async () => null, save: async () => {} },
    })

    expect(await readAccount(container, { accountId: "a1", clientId: "c1" })).toBeNull()
  })

  it("returns epic as current at volume 0 with default levels", async () => {
    const account = await readAccount(fakeContainer(), { accountId: "a1", clientId: "c1" })

    expect(account?.levels.volume30d).toBe(0)
    expect(account?.levels.current.key).toBe("epic")
    expect(account?.levels.next?.key).toBe("mythic")
    expect(account?.levels.toNext).toBe(1000)
    expect(account?.levels.percent).toBe(0)
    expect(account?.levels.effectiveMarginBasisPoints).toBe(2000)
    expect(account?.levels.levels.length).toBe(3)
    expect(account?.levels.earnedBadges.map((b) => b.levelKey)).toContain("epic")
  })

  it("returns mythic as current at volume 1500", async () => {
    const account = await readAccount(fakeContainer({ activity: fakeActivity(1500) }), {
      accountId: "a1",
      clientId: "c1",
    })

    expect(account?.levels.volume30d).toBe(1500)
    expect(account?.levels.current.key).toBe("mythic")
    expect(account?.levels.next?.key).toBe("immortal")
    expect(account?.levels.toNext).toBe(3500)
    expect(account?.levels.percent).toBe(12)
  })

  it("returns immortal as current with no next at volume 5000", async () => {
    const account = await readAccount(fakeContainer({ activity: fakeActivity(5000) }), {
      accountId: "a1",
      clientId: "c1",
    })

    expect(account?.levels.volume30d).toBe(5000)
    expect(account?.levels.current.key).toBe("immortal")
    expect(account?.levels.next).toBeNull()
    expect(account?.levels.toNext).toBe(0)
    expect(account?.levels.percent).toBe(100)
  })

  it("flows a custom stored level set verbatim into levels", async () => {
    const custom = [
      { key: "bronze", coins: 0, basisPoints: 1800, title: "Bronze Custom", icon: "tag", color: "jade" },
      { key: "silver", coins: 500, basisPoints: 1200, title: "Silver Custom", icon: "bolt", color: "sky" },
    ]
    const account = await readAccount(
      fakeContainer({
        settings: fakeSettings({ "markup:vip:mlbb": JSON.stringify({ levels: custom }) }),
      }),
      { accountId: "a1", clientId: "c1" },
    )

    expect(account?.levels.levels).toEqual(custom)
    expect(account?.levels.current.key).toBe("bronze")
    expect(account?.levels.next?.key).toBe("silver")
  })

  it("maps persisted badges into earnedBadges, including orphaned keys", async () => {
    const persisted: EarnedLevel[] = [
      epicBadge,
      {
        levelKey: "retired",
        coins: 100,
        title: "Retired Old",
        icon: "gift",
        color: "gold",
        earnedAt: "2026-02-01T00:00:00.000Z",
      },
    ]
    const earn = vi.fn(async () => {})
    const listByClient = vi.fn(async () => persisted)
    const account = await readAccount(fakeContainer({ levelAchievements: { earn, listByClient } }), {
      accountId: "a1",
      clientId: "c1",
    })

    expect(listByClient).toHaveBeenCalledWith("c1")
    expect(account?.levels.earnedBadges).toEqual(persisted)
    expect(account?.levels.levels.map((l) => l.key)).not.toContain("retired")
  })

  it("maps order DTO fields: createdAt Date/string/null, player ids, playerName", async () => {
    const withDate = order({
      id: "o-date",
      token: "t-date",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
      player: player("9", "8"),
      price: money(1000, "USD"),
      status: "PAID",
      markupBasisPoints: 0,
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      playerName: "Hero",
    })
    const withString = order({
      id: "o-str",
      token: "t-str",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
      player: player("7", "6"),
      price: money(1000, "USD"),
      status: "PAID",
      markupBasisPoints: 0,
      createdAt: "2026-03-02T10:00:00.000Z",
    })
    const withNull = order({
      id: "o-null",
      token: "t-null",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
      player: player("5", "4"),
      price: money(1000, "USD"),
      status: "PAID",
      markupBasisPoints: 0,
    })
    const container = fakeContainer({
      orders: {
        listByClient: async () => [withDate, withString, withNull],
        save: async () => {},
        findById: async () => withDate,
        findByToken: async () => withDate,
        update: async () => {},
        listRecent: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
    })
    const account = await readAccount(container, { accountId: "a1", clientId: "c1" })

    expect(account?.orders[0]).toMatchObject({
      id: "o-date",
      createdAt: "2026-03-01T10:00:00.000Z",
      userId: "9",
      serverId: "8",
      playerName: "Hero",
    })
    expect(account?.orders[1]).toMatchObject({
      id: "o-str",
      createdAt: "2026-03-02T10:00:00.000Z",
      userId: "7",
      serverId: "6",
      playerName: null,
    })
    expect(account?.orders[2]).toMatchObject({
      id: "o-null",
      createdAt: null,
      userId: "5",
      serverId: "4",
      playerName: null,
    })
  })

  it("flows profile createdAt through to the DTO", async () => {
    const dated = gamingProfile({
      id: "g2",
      accountId: "a1",
      label: "Dated",
      userId: "3",
      serverId: "4",
      game: "mlbb",
      createdAt: "2026-04-01T00:00:00.000Z",
    })
    const container = fakeContainer({
      gamingProfiles: { listByAccount: async () => [profile, dated], add: async () => {}, remove: async () => {} },
    })
    const account = await readAccount(container, { accountId: "a1", clientId: "c1" })

    expect(account?.profiles[0]).toMatchObject({ id: "g1", createdAt: null })
    expect(account?.profiles[1]).toMatchObject({ id: "g2", createdAt: "2026-04-01T00:00:00.000Z" })
  })

  it("marks exactly the preferred profile true; others false", async () => {
    const other = gamingProfile({ id: "g2", accountId: "a1", label: "Alt", userId: "3", serverId: "4", game: "mlbb" })
    const container = fakeContainer({
      gamingProfiles: { listByAccount: async () => [profile, other], add: async () => {}, remove: async () => {} },
      accounts: {
        setPreference: async () => {},
        findByEmail: async () => null,
        findById: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        list: async () => ({ rows: [], total: 0 }),
        listPreferences: async () => ({ player: "1/2" }),
      },
    })
    const account = await readAccount(container, { accountId: "a1", clientId: "c1" })

    expect(account?.profiles.map((p) => [p.id, p.preferred])).toEqual([["g1", true], ["g2", false]])
  })

  it("marks all profiles not preferred for empty or malformed preferences", async () => {
    const other = gamingProfile({ id: "g2", accountId: "a1", label: "Alt", userId: "3", serverId: "4", game: "mlbb" })
    const profiles = [profile, other]
    const cases: Record<string, string>[] = [{}, { player: "abc" }, { player: "1/" }, { player: "1/2/3" }]

    for (const prefs of cases) {
      const container = fakeContainer({
        gamingProfiles: { listByAccount: async () => profiles, add: async () => {}, remove: async () => {} },
        accounts: {
          setPreference: async () => {},
          findByEmail: async () => null,
          findById: async () => null,
          create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
          list: async () => ({ rows: [], total: 0 }),
          listPreferences: async () => prefs,
        },
      })
      const account = await readAccount(container, { accountId: "a1", clientId: "c1" })
      expect(account?.profiles.every((p) => p.preferred === false)).toBe(true)
    }
  })
})

describe("profiles", () => {
  it("lists profiles as DTOs", async () => {
    expect(await listProfiles(fakeContainer(), { accountId: "a1", clientId: "c1" })).toEqual([
      { id: "g1", label: "Main", userId: "1", serverId: "2", game: "mlbb", playerName: null, createdAt: null, preferred: false },
    ])
  })

  it("adds a profile with the injected id", async () => {
    const add = vi.fn(async () => {})
    const container = fakeContainer({
      gamingProfiles: { listByAccount: async () => [], add, remove: async () => {} },
    })

    await addProfile(
      container,
      { accountId: "a1", clientId: "c1" },
      { label: "Alt", game: "mlbb", userId: "3", serverId: "4" },
      () => "new",
    )

    expect(add).toHaveBeenCalledWith({
      id: "new",
      accountId: "a1",
      label: "Alt",
      game: "mlbb",
      userId: "3",
      serverId: "4",
      playerName: "Player",
    })
  })

    it("marks exactly the preferred profile in listProfiles", async () => {
    const other = gamingProfile({ id: "g2", accountId: "a1", label: "Alt", userId: "3", serverId: "4", game: "mlbb" })
    const container = fakeContainer({
      gamingProfiles: { listByAccount: async () => [profile, other], add: async () => {}, remove: async () => {} },
      accounts: {
        setPreference: async () => {},
        findByEmail: async () => null,
        findById: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        list: async () => ({ rows: [], total: 0 }),
        listPreferences: async () => ({ player: "3/4" }),
      },
    })

    expect(await listProfiles(container, { accountId: "a1", clientId: "c1" })).toMatchObject([
      { id: "g1", preferred: false },
      { id: "g2", preferred: true, createdAt: null },
    ])
  })

  it("rejects an invalid player before saving", async () => {
      const add = vi.fn(async () => {})
      const container = fakeContainer({
        distributor: {
          checkPlayer: async () => ({ valid: false, name: null }),
          placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
          getOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
          getBalance: async () => ({ balanceMinor: 0 }),
        },
        gamingProfiles: { listByAccount: async () => [], add, remove: async () => {} },
      })

    await expect(
      addProfile(
        container,
        { accountId: "a1", clientId: "c1" },
        { label: "Alt", game: "mlbb", userId: "3", serverId: "4" },
        () => "new",
      ),
    ).rejects.toBeInstanceOf(InvalidPlayerError)
    expect(add).not.toHaveBeenCalled()
  })

    it("rejects when the distributor cannot verify the player", async () => {
      const add = vi.fn(async () => {})
      const container = fakeContainer({
        distributor: {
          checkPlayer: async () => {
            throw new Error("distributor down")
          },
          placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
          getOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
          getBalance: async () => ({ balanceMinor: 0 }),
        },
        gamingProfiles: { listByAccount: async () => [], add, remove: async () => {} },
      })

    await expect(
      addProfile(
        container,
        { accountId: "a1", clientId: "c1" },
        { label: "Alt", game: "mlbb", userId: "3", serverId: "4" },
        () => "new",
      ),
    ).rejects.toBeInstanceOf(PlayerVerificationError)
    expect(add).not.toHaveBeenCalled()
  })

  it("removes a profile scoped to the account", async () => {
    const remove = vi.fn(async () => {})
    const container = fakeContainer({
      gamingProfiles: { listByAccount: async () => [], add: async () => {}, remove },
    })

    await removeProfile(container, { accountId: "a1", clientId: "c1" }, "g1")

    expect(remove).toHaveBeenCalledWith("g1", "a1")
  })
})

describe("savePreference", () => {
  it("stores the player preference on the account", async () => {
    const setPreference = vi.fn(async () => {})
    const container = fakeContainer({
      accounts: {
        setPreference,
        findByEmail: async () => null,
        findById: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        list: async () => ({ rows: [], total: 0 }),
        listPreferences: async () => ({}),
      },
    })

    await savePreference(container, { accountId: "a1", clientId: "c1" }, "1", "2")

    expect(setPreference).toHaveBeenCalledWith("a1", "player", "1/2")
  })
})
