/**
 * Authenticates an account by normalized email and password verification.
 * Returns account and client identifiers, or null when credentials do not match.
 */
import { AccountRepository } from "../ports/account-repository"
import { verifyPassword } from "../domain/password"

export function createSignIn(deps: {
  accounts: AccountRepository
}): (input: { email: string; password: string }) => Promise<{ accountId: string; clientId: string } | null> {
  return async (input) => {
    const email = input.email.trim().toLowerCase()
    const account = await deps.accounts.findByEmail(email)
    if (account === null) {
      return null
    }
    const ok = await verifyPassword(input.password, account.passwordHash)
    if (!ok) {
      return null
    }
    return { accountId: account.id, clientId: account.clientId }
  }
}
