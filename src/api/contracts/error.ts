/**
 * Defines the minimal API boundary shape for error responses, carrying a
 * single error code or message.
 */

export type ApiErrorDto = { readonly error: string }
