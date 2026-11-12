import { describe, expect, test } from "vitest"
import { ClientAccount } from "../ports/account-repository"
import { AccountRepository } from "../ports/account-repository"
import { createSignIn } from "./sign-in"
import { hashPassword } from "../domain/password"

class InMemoryAccountRepository implements AccountRepository {
  accounts: ClientAccount[] = []
  async findByEmail(email: string) {
    return this.accounts.find((a) => a.email === email) ?? null
  }
  async findById(id: string) {
    return this.accounts.find((a) => a.id === id) ?? null
  }
  async list(input: { skip: number; take: number }) {
    return { rows: [], total: 0 }
  }
  async create(input: { id: string; clientId: string; email: string; username: string; passwordHash: string }) {
    const account: ClientAccount = { id: input.id, clientId: input.clientId, email: input.email, username: input.username, passwordHash: input.passwordHash }
    this.accounts.push(account)
    return account
  }
  async listPreferences() {
    return {}
  }
  async setPreference() {}
}

describe("sign-in", () => {
  test("returns the ids for the right password", async () => {
    const accounts = new InMemoryAccountRepository()
    accounts.accounts.push({ id: "acc1", clientId: "cli1", email: "a@b.com", username: "user1", passwordHash: await hashPassword("password123") })
    const signIn = createSignIn({ accounts })
    const result = await signIn({ email: "a@b.com", password: "password123" })
    expect(result).toEqual({ accountId: "acc1", clientId: "cli1" })
  })

  test("returns null for a wrong password", async () => {
    const accounts = new InMemoryAccountRepository()
    accounts.accounts.push({ id: "acc1", clientId: "cli1", email: "a@b.com", username: "user1", passwordHash: await hashPassword("password123") })
    const signIn = createSignIn({ accounts })
    const result = await signIn({ email: "a@b.com", password: "wrongpassword" })
    expect(result).toBeNull()
  })

  test("returns null for an unknown email", async () => {
    const accounts = new InMemoryAccountRepository()
    const signIn = createSignIn({ accounts })
    const result = await signIn({ email: "nope@b.com", password: "password123" })
    expect(result).toBeNull()
  })

  test("normalizes the email before lookup", async () => {
    const accounts = new InMemoryAccountRepository()
    accounts.accounts.push({ id: "acc1", clientId: "cli1", email: "a@b.com", username: "user1", passwordHash: await hashPassword("password123") })
    const signIn = createSignIn({ accounts })
    const result = await signIn({ email: "  A@B.COM  ", password: "password123" })
    expect(result).toEqual({ accountId: "acc1", clientId: "cli1" })
  })
})
