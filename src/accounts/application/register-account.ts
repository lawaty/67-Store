/**
 * Registers a new client account after normalizing email and rejecting duplicates.
 * Creates the client, hashes the password, and persists the account through ports.
 */
import { AccountRepository } from "../ports/account-repository"
import { ClientRepository } from "../ports/client-repository"
import { client } from "../domain/client"
import { hashPassword } from "../domain/password"
import { AccountError } from "../domain/account-error"

export function createRegisterAccount(deps: {
  accounts: AccountRepository
  clients: ClientRepository
  newId: () => string
}): (input: { email: string; password: string }) => Promise<{ accountId: string; clientId: string }> {
  return async (input) => {
    const email = input.email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new AccountError("A valid email is required")
    }
    const existing = await deps.accounts.findByEmail(email)
    if (existing !== null) {
      throw new AccountError("Email already registered")
    }
    const passwordHash = await hashPassword(input.password)
    const c = client(deps.newId())
    await deps.clients.save(c)
    const account = await deps.accounts.create({
      id: deps.newId(),
      clientId: c.id,
      email,
      passwordHash,
    })
    return { accountId: account.id, clientId: c.id }
  }
}
