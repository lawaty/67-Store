/**
 * Serves account and gaming profile requests for an authenticated viewer,
 * reading account data and validating players before adding profiles.
 */

import type { Container } from "@/container"
import type { AccountDto, AccountLevelDto, ProfileDto } from "./contracts"
import { presentProfile } from "./storefront"
import {
  player,
  readQualifyingVolume,
  readVipLevels,
  recordLevelAchievements,
  resolveClientMarkup,
  type Level,
} from "@/ordering"
import { levelProgress } from "@/ordering"

function preferredTarget(preferences: Record<string, string>): { userId: string; serverId: string } | null {
  const value = preferences["player"]
  if (!value) return null
  const parts = value.split("/")
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return null
  return { userId: parts[0], serverId: parts[1] }
}

export type AccountViewer = {
  readonly accountId: string
  readonly clientId: string
}

export type ProfileInput = {
  readonly label: string
  readonly game: string
  readonly userId: string
  readonly serverId: string
}

function toLevelDto(level: Level): AccountLevelDto {
  return {
    key: level.key,
    title: level.title,
    icon: level.icon,
    color: level.color,
    coins: level.coins,
    basisPoints: level.basisPoints,
  }
}

export async function readAccount(c: Container, viewer: AccountViewer): Promise<AccountDto | null> {
  const client = await c.clients.findById(viewer.clientId)
  if (client === null) return null

  const now = new Date()
  const [orders, wallet, entries, profiles, levels, volume30d, preferences] = await Promise.all([
    c.orders.listByClient(viewer.clientId, 20),
    c.wallets.getOrCreate(viewer.clientId),
    c.wallets.listEntries(viewer.clientId, 10),
    c.gamingProfiles.listByAccount(viewer.accountId),
    readVipLevels(c.settings, "mlbb"),
    readQualifyingVolume(c.activity, viewer.clientId, now),
    c.accounts.listPreferences(viewer.accountId),
  ])

  const earnedBadges = await recordLevelAchievements(c.levelAchievements, viewer.clientId, levels, volume30d, now)
  const progress = levelProgress(levels, volume30d)
  const effectiveMarginBasisPoints = await resolveClientMarkup(c.settings, "mlbb", {
    clientId: viewer.clientId,
    coinsConsumed: volume30d,
  })
  const fundingAvailable = (await c.operationsMode()) === "sandbox"
  const target = preferredTarget(preferences)

  return {
    fundingAvailable,
    orders: orders.map((order) => ({
      id: order.id,
      token: order.token,
      status: order.status,
      productName: order.product.name,
      price: order.price,
      createdAt:
        order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : typeof order.createdAt === "string" && order.createdAt.length > 0
            ? order.createdAt
            : null,
      userId: order.player.userId,
      serverId: order.player.serverId,
      playerName: order.playerName ?? null,
    })),
    wallet: { coinBalance: wallet.coinBalance },
    entries: entries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
    profiles: profiles.map((p) => ({
      ...presentProfile(p),
      preferred: p.userId === target?.userId && p.serverId === target?.serverId,
    })),
    levels: {
      volume30d,
      current: toLevelDto(progress.current),
      next: progress.next === null ? null : toLevelDto(progress.next),
      toNext: progress.toNext,
      percent: progress.percent,
      effectiveMarginBasisPoints,
      levels: levels.map(toLevelDto),
      earnedBadges: earnedBadges.map((b) => ({
        levelKey: b.levelKey,
        title: b.title,
        icon: b.icon,
        color: b.color,
        coins: b.coins,
        earnedAt: b.earnedAt,
      })),
    },
  }
}

export async function listProfiles(c: Container, viewer: AccountViewer): Promise<ProfileDto[]> {
  const [profiles, preferences] = await Promise.all([
    c.gamingProfiles.listByAccount(viewer.accountId),
    c.accounts.listPreferences(viewer.accountId),
  ])
  const target = preferredTarget(preferences)
  return profiles.map((p) => ({
    ...presentProfile(p),
    preferred: p.userId === target?.userId && p.serverId === target?.serverId,
  }))
}

export class InvalidPlayerError extends Error {
  constructor() {
    super("player_invalid")
    this.name = "InvalidPlayerError"
  }
}

export class PlayerVerificationError extends Error {
  constructor() {
    super("player_unverified")
    this.name = "PlayerVerificationError"
  }
}

export async function addProfile(
  c: Container,
  viewer: AccountViewer,
  input: ProfileInput,
  newId: () => string,
): Promise<void> {
  const target = player(input.userId, input.serverId)
  const check = await c.distributor.checkPlayer({ game: input.game, player: target }).catch(() => null)
  if (check === null) throw new PlayerVerificationError()
  if (!check.valid) throw new InvalidPlayerError()

  await c.gamingProfiles.add({
    id: newId(),
    accountId: viewer.accountId,
    label: input.label,
    game: input.game,
    userId: target.userId,
    serverId: target.serverId,
    playerName: check.name,
  })
}

export async function removeProfile(c: Container, viewer: AccountViewer, profileId: string): Promise<void> {
  await c.gamingProfiles.remove(profileId, viewer.accountId)
}

export async function savePreference(
  c: Container,
  viewer: AccountViewer,
  userId: string,
  serverId: string,
): Promise<void> {
  await c.accounts.setPreference(viewer.accountId, "player", `${userId}/${serverId}`)
}
