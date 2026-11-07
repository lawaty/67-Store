/**
 * Declares key-value settings access with no domain meaning baked in.
 */
export interface SettingsRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  all(): Promise<Record<string, string>>
}
