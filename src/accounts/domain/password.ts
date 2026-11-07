/**
 * Hashes and verifies account passwords with scrypt and a per-password salt.
 * Verification uses timing-safe comparison and rejects malformed stored hashes.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>

const HEX = /^[0-9a-f]+$/i

export async function hashPassword(plain: string): Promise<string> {
  if (plain.trim().length < 8) {
    throw new RangeError("Password must be at least 8 characters")
  }
  const salt = randomBytes(16)
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const colonIndex = stored.indexOf(":")
  if (colonIndex <= 0 || colonIndex === stored.length - 1) return false
  const saltHex = stored.slice(0, colonIndex)
  const hashHex = stored.slice(colonIndex + 1)
  if (hashHex.includes(":")) return false
  if (!HEX.test(saltHex) || !HEX.test(hashHex)) return false
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return false
  const salt = Buffer.from(saltHex, "hex")
  const storedHash = Buffer.from(hashHex, "hex")
  if (salt.length === 0 || storedHash.length === 0) return false

  let derived: Buffer
  try {
    derived = (await scryptAsync(plain, salt, 64)) as Buffer
  } catch {
    return false
  }
  if (derived.length !== storedHash.length) return false
  try {
    return timingSafeEqual(derived, storedHash)
  } catch {
    return false
  }
}