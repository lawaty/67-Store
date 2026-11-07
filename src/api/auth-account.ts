/**
 * Handles account sign-in and registration flows, issuing signed session
 * tokens and creating a default gaming profile when player data is provided.
 */

import type { Container } from "@/container"
import { AccountError } from "@/accounts"
import { createRegisterAccount } from "@/accounts"
import { signSession } from "@/accounts"
import { createSignIn } from "@/accounts"
import { SESSION_MAX_AGE } from "@/shared/session-cookie"
import type { AuthResultDto } from "./contracts"

export type Credentials = {
  readonly email: string
  readonly password: string
}

export type RegisterInput = Credentials & {
  readonly playerUserId: string
  readonly playerServerId: string
  readonly locale: string
}

export type RegisterOutcome =
  | { readonly ok: true; readonly result: AuthResultDto }
  | { readonly ok: false; readonly error: "email" | "password" }

export function issueSession(
  session: { readonly accountId: string; readonly clientId: string },
  secret: string,
  now: number = Date.now(),
): AuthResultDto {
  return {
    token: signSession({ ...session, expiresAt: now + SESSION_MAX_AGE * 1000 }, secret),
    maxAge: SESSION_MAX_AGE,
  }
}

export async function signIn(
  c: Container,
  credentials: Credentials,
  secret: string,
  now: number = Date.now(),
): Promise<AuthResultDto | null> {
  const account = await createSignIn({ accounts: c.accounts })(credentials)
  return account === null ? null : issueSession(account, secret, now)
}

export async function register(
  c: Container,
  input: RegisterInput,
  secret: string,
  deps: { readonly newId: () => string },
  now: number = Date.now(),
): Promise<RegisterOutcome> {
  let created: { accountId: string; clientId: string }
  try {
    created = await createRegisterAccount({
      accounts: c.accounts,
      clients: c.clients,
      newId: deps.newId,
    })({ email: input.email, password: input.password })
  } catch (error) {
    if (error instanceof AccountError) return { ok: false, error: "email" }
    if (error instanceof RangeError) return { ok: false, error: "password" }
    throw error
  }

  if (input.playerUserId !== "" && input.playerServerId !== "") {
    try {
      await c.gamingProfiles.add({
        id: deps.newId(),
        accountId: created.accountId,
        label: input.locale === "en" ? "My profile" : "بروفايلي",
        userId: input.playerUserId,
        serverId: input.playerServerId,
        game: "mlbb",
      })
    } catch {
      // A saved profile is a convenience; registration still succeeds.
    }
  }

  return { ok: true, result: issueSession(created, secret, now) }
}
