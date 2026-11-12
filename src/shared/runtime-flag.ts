import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const cache = new Map<string, { mtimeMs: number; value: boolean | null }>()

/**
 * Reads a runtime boolean flag from a file (contents "true"/"false"), falling
 * back to the given env value when the file is absent or malformed. The file is
 * re-read when its mtime changes, so flipping it needs no restart.
 */
export function readRuntimeFlag(fileName: string, envValue: boolean): boolean {
  const envKey = `${fileName.toUpperCase().replace(/-/g, "_")}_FILE`
  const file = process.env[envKey] || join(process.cwd(), fileName)
  try {
    const st = statSync(file)
    const cached = cache.get(file)
    if (cached && cached.mtimeMs === st.mtimeMs) return cached.value ?? envValue
    const raw = readFileSync(file, "utf8").trim().toLowerCase()
    const value = raw === "true" ? true : raw === "false" ? false : null
    cache.set(file, { mtimeMs: st.mtimeMs, value })
    return value ?? envValue
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // The flag file is genuinely absent: the env value is the intended source.
      cache.delete(file)
      return envValue
    }
    // The file exists but could not be read (permissions, torn write, I/O
    // error). Do not silently revert an operator-set flag to the env value:
    // reuse the last successfully read value, or fail loudly.
    const cached = cache.get(file)
    if (cached) return cached.value ?? envValue
    throw error
  }
}
