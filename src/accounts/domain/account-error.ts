/**
 * Domain error for account operations, used to report validation or registration failures.
 */
export class AccountError extends Error {
  constructor(message: string) { super(message); this.name = "AccountError" }
}
