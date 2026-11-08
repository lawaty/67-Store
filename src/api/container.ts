/**
 * Provides a cached application container for API handlers, wiring Prisma and
 * environment configuration once per process.
 */

import { prisma } from "@/infrastructure/prisma/client"
import { readEnv } from "@/env"
import { createContainer, type Container } from "@/container"
import { readP2pTodaySnapshot } from "@/treasury"

let cached: Container | undefined

export function getContainer(): Container {
  if (!cached) cached = createContainer(readEnv(process.env as Record<string, string | undefined>), prisma)
  return cached
}

export function readP2pToday(now: string) {
  return readP2pTodaySnapshot(getContainer().settings, now)
}