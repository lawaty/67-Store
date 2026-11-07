/**
 * Result of a read-only player verification check.
 */
export type PlayerCheckDto = {
  readonly valid: boolean
  readonly name: string | null
}
