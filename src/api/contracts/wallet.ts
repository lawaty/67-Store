/**
 * Defines the wallet operation outcome boundary shape for API responses.
 * Encodes success with an account id or a tagged failure with an error code.
 */
export type WalletOutcomeDto =
  | { readonly ok: true; readonly accountId: string }
  | { readonly ok: false; readonly error: string; readonly accountId: string }
