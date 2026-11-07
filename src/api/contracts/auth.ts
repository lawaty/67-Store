/**
 * Defines API boundary shapes for authentication results, carrying session or
 * admin tokens issued to clients.
 */

export type AuthResultDto = {
  readonly token: string
  readonly maxAge: number
}

export type AdminAuthResultDto = {
  readonly token: string
}
