import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const UI_DIRS = ["src/app", "src/frontend"]

const FORBIDDEN = [
  "@/container",
  "@/api/container",
  "@/infrastructure",
  "@prisma/client",
  "@/ordering",
  "@/payments",
  "@/fulfilment",
  "@/catalogue",
  "@/offers",
  "@/promos",
  "@/wallet",
  "@/accounts",
  "@/backoffice",
  "@/jobs",
  "@/integration",
  "@/env",
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(ts|tsx)$/.test(path) ? [path] : []
  })
}

function relativePath(file: string): string {
  return relative(root, file)
}

describe("frontend/backend boundary", () => {
  it("pages, actions and the frontend client never import backend modules", () => {
    const files = UI_DIRS.flatMap((dir) => walk(join(root, dir)))
      .filter((file) => !relativePath(file).startsWith(join("src", "app", "api") + "/"))
      .filter((file) => !relativePath(file).endsWith("boundary.test.ts"))

    const violations: string[] = []
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      for (const specifier of FORBIDDEN) {
        if (source.includes(`"${specifier}`) || source.includes(`'${specifier}`)) {
          violations.push(`${relativePath(file)} imports ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
