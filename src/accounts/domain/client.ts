/**
 * Client domain identity.
 * The factory trims and requires a non-empty id, returning an immutable client.
 */
export type Client = { readonly id: string }

export function client(id: string): Client {
  const trimmed = id.trim()
  if (trimmed.length === 0) {
    throw new RangeError()
  }
  return Object.freeze({ id: trimmed })
}
