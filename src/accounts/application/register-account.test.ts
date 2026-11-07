import { describe, expect, test } from "vitest"
import { client } from "../domain/client"
import { ClientRepository } from "../ports/client-repository"
import { AccountRepository, ClientAccount } from "../ports/account-repository"
import { createRegisterAccount } from "./register-account"
import { verifyPassword } from "../domain/password"

class InMemoryClientRepository implements ClientRepository {
  saved: ReturnType<typeof client>[] = []
  async save(c: ReturnType<typeof client>): Promise<void> {
    this.saved.push(c)
  }
  async findById(id: string) {
    return this.saved.find((c) => c.id === id) ?? null
  }
}

class InMemoryAccountRepository implements AccountRepository {
  accounts: ClientAccount[] = []
  preferences: Record<string, Record<string, string>> = {}
  async findByEmail(email: string) {
    return this.accounts.find((a) => a.email === email) ?? null
  }
  async findById(id: string) {
    return this.accounts.find((a) => a.id === id) ?? null
  }
  async list() {
    return { rows: [], total: 0 }
  }
  async create(input: { id: string; clientId: string; email: string; passwordHash: string }) {
    const account: ClientAccount = { id: input.id, clientId: input.clientId, email: input.email, passwordHash: input.passwordHash }
    this.accounts.push(account)
    return account
  }
  async listPreferences(accountId: string) {
    return this.preferences[accountId] ?? {}
  }
  async setPreference(accountId: string, key: string, value: string) {
    if (!this.preferences[accountId]) this.preferences[accountId] = {}
    this.preferences[accountId][key] = value
  }
}

describe("register-account", () => {
  test("creates a client and an account, returning both ids", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    const result = await register({ email: "a@b.com", password: "password123" })
    expect(result.accountId).toBeTruthy()
    expect(result.clientId).toBeTruthy()
    expect(clients.saved.length).toBe(1)
    expect(clients.saved[0].id).toBeTruthy()
    expect(accounts.accounts.length).toBe(1)
  })

  test("normalizes the email to lower case and trims it", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    await register({ email: "  A@B.COM  ", password: "password123" })
    expect(accounts.accounts[0].email).toBe("a@b.com")
  })

  test("rejects an invalid email, creating nothing", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    await expect(register({ email: "not-an-email", password: "password123" })).rejects.toThrow("A valid email is required")
    expect(clients.saved.length).toBe(0)
    expect(accounts.accounts.length).toBe(0)
  })

  test("rejects a duplicate email, creating nothing", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    await register({ email: "a@b.com", password: "password123" })
    const beforeClients = clients.saved.length
    const beforeAccounts = accounts.accounts.length
    await expect(register({ email: "a@b.com", password: "password123" })).rejects.toThrow("Email already registered")
    expect(clients.saved.length).toBe(beforeClients)
    expect(accounts.accounts.length).toBe(beforeAccounts)
  })

  test("a password shorter than 8 characters rejects with RangeError and creates no client", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    await expect(register({ email: "a@b.com", password: "short" })).rejects.toBeInstanceOf(RangeError)
    expect(clients.saved.length).toBe(0)
    expect(accounts.accounts.length).toBe(0)
  })

  test("the stored hash is not the plain password and verifies with verifyPassword", async () => {
    const clients = new InMemoryClientRepository()
    const accounts = new InMemoryAccountRepository()
    let n = 0
    const register = createRegisterAccount({ accounts, clients, newId: () => `id${++n}` })
    await register({ email: "a@b.com", password: "password123" })
    const stored = accounts.accounts[0].passwordHash
    expect(stored).not.toBe("password123")
    expect(await verifyPassword("password123", stored)).toBe(true)
  })
})
