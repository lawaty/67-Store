/**
 * Declares account persistence capabilities for the application layer.
 * Covers account lookup/creation, admin listing, and account preference storage.
 */
export type ClientAccount = {
  readonly id: string
  readonly clientId: string
  readonly email: string
  readonly passwordHash: string
}

export interface AccountRepository {
  findByEmail(email: string): Promise<ClientAccount | null>
  findById(id: string): Promise<ClientAccount | null>
  create(input: { id: string; clientId: string; email: string; passwordHash: string }): Promise<ClientAccount>
  list(input: { skip: number; take: number }): Promise<{ rows: { readonly id: string; readonly clientId: string; readonly email: string; readonly coinBalance: number; readonly createdAt: string }[]; total: number }>
  listPreferences(accountId: string): Promise<Record<string, string>>
  setPreference(accountId: string, key: string, value: string): Promise<void>
}
