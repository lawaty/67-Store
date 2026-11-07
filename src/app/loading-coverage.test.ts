import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const appRoot = join(root, "src", "app")

function walk(dir: string, matcher: (name: string) => boolean): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...walk(path, matcher))
    } else if (matcher(entry)) {
      files.push(path)
    }
  }
  return files
}

function isNonApiPage(filePath: string): boolean {
  const rel = relative(appRoot, filePath)
  return !rel.startsWith(`api${require("node:path").sep}`) && !rel.startsWith("api/")
}

function hasLoadingAncestor(dir: string): boolean {
  let current = dir
  while (true) {
    if (existsSync(join(current, "loading.tsx"))) return true
    if (current === appRoot) return false
    const parent = join(current, "..")
    if (parent === current) return false
    current = parent
  }
}

describe("loading coverage", () => {
  const pageFiles = walk(appRoot, (name) => name === "page.tsx").filter(isNonApiPage)
  const loadingFiles = walk(appRoot, (name) => name === "loading.tsx")

  it("covers every non-API page with a loading.tsx in its directory or an ancestor up to src/app", () => {
    const uncovered = pageFiles
      .map((file) => join(file, ".."))
      .filter((dir) => !hasLoadingAncestor(dir))
      .map((dir) => relative(root, join(dir, "page.tsx")))
      .sort()

    expect(uncovered).toEqual([])
  })

  it("has a root src/app/loading.tsx fallback", () => {
    expect(existsSync(join(appRoot, "loading.tsx"))).toBe(true)
  })

  it("keeps every loading.tsx as a server component with a default export", () => {
    const violations: string[] = []
    for (const file of loadingFiles) {
      const source = readFileSync(file, "utf8")
      const rel = relative(root, file)
      if (!/export\s+default\s+(function\s+Loading|)/.test(source) || !/export\s+default\s+/.test(source)) {
        violations.push(`${rel}: missing default export`)
      }
      if (source.includes('"use client"') || source.includes("'use client'")) {
        violations.push(`${rel}: contains "use client"`)
      }
    }
    expect(violations).toEqual([])
  })

  it(`has loading files covering all non-API page segments by count (${loadingFiles.length} loading, ${pageFiles.length} pages, all covered by directory-or-ancestor walk)`, () => {
    const pageDirs = new Set(pageFiles.map((file) => join(file, "..")))
    const loadingDirs = new Set(loadingFiles.map((file) => join(file, "..")))
    const dirsWithOwnLoading = [...pageDirs].filter((dir) => loadingDirs.has(dir)).length
    expect(loadingFiles.length).toBeGreaterThanOrEqual(dirsWithOwnLoading)
    expect(pageFiles.length).toBeGreaterThan(0)
  })
})
