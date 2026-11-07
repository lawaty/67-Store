import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const srcRoot = join(root, "src")
const selfFile = relative(root, __filename)

function walk(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...walk(path))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      const rel = relative(root, path)
      if (rel === selfFile) continue
      files.push(path)
    }
  }
  return files
}

function stripComments(source: string): string {
  let result = source.replace(/\/\*[\s\S]*?\*\//g, "")
  result = result.replace(/(^|[^"'`])\/\/.*$/gm, "$1")
  return result
}

function extractSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(source)) !== null) {
    specifiers.push(match[1])
  }
  const exportRegex = /export\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  while ((match = exportRegex.exec(source)) !== null) {
    specifiers.push(match[1])
  }
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = dynamicImportRegex.exec(source)) !== null) {
    specifiers.push(match[1])
  }
  return specifiers
}

function resolveSpecifier(specifier: string, filePath: string): string | null {
  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2)
    const resolved = join(srcRoot, relativePath)
    return normalizePath(resolved)
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const resolved = resolve(dirname(filePath), specifier)
    if (resolved.startsWith(srcRoot)) {
      return normalizePath(resolved)
    }
    return null
  }
  return specifier
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/")
}

const FEATURES = ["accounts", "alerts", "backoffice", "catalogue", "fulfilment", "jobs", "ordering", "payments", "promos", "treasury", "wallet"]

function getZone(relPath: string): string {
  if (relPath.startsWith("src/shared")) return "shared"
  if (relPath.startsWith("src/env")) return "env"
  if (relPath.startsWith("src/i18n")) return "i18n"
  if (relPath === "src/container.ts" || relPath === "src/container") return "container"
  
  for (const feature of FEATURES) {
    if (relPath.startsWith(`src/${feature}/`) || relPath === `src/${feature}`) {
      return `feature:${feature}`
    }
  }
  
  if (relPath.startsWith("src/frontend")) return "frontend"
  if (relPath.startsWith("src/api")) return "api"
  if (relPath.startsWith("src/container/")) return "container"
  if (relPath.startsWith("src/infrastructure")) return "infrastructure"
  if (relPath.startsWith("src/integration")) return "integration"
  if (relPath.startsWith("src/app/api/")) return "app/api"
  if (relPath.startsWith("src/app/")) return "app"
  
  return "unknown"
}

function getFeatureFromPath(relPath: string): string | null {
  if (!relPath) return null
  for (const feature of FEATURES) {
    if (relPath.startsWith(`src/${feature}/`) || relPath === `src/${feature}`) {
      return feature
    }
  }
  return null
}

function isInFeatureLayer(relPath: string, layer: "domain" | "ports" | "application"): boolean {
  const feature = getFeatureFromPath(relPath)
  if (!feature) return false
  return relPath.startsWith(`src/${feature}/${layer}/`)
}

function isFeatureIndexImport(specifier: string, resolvedRel: string | null, feature: string): boolean {
  if (specifier === `@/${feature}`) return true
  if (specifier === `@/${feature}/index`) return true
  if (specifier === `@/${feature}/index.ts`) return true
  if (resolvedRel === `src/${feature}/index.ts`) return true
  if (resolvedRel === `src/${feature}`) return true
  return false
}

describe("architecture boundaries", () => {
  it("enforces zone matrix and boundaries", () => {
    const files = walk(srcRoot)
    const violations: string[] = []
    
    for (const filePath of files) {
      const relPath = relative(root, filePath)
      const zone = getZone(relPath)
      const source = stripComments(readFileSync(filePath, "utf8"))
      const specifiers = extractSpecifiers(source)
      
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(specifier, filePath)
        if (resolved === null) continue
        
        let resolvedRel = typeof resolved === "string" && resolved.startsWith(srcRoot) ? relative(root, resolved) : null
        // Normalize container imports
        if (resolvedRel === "src/container" && require('fs').existsSync(join(srcRoot, "container.ts"))) {
          resolvedRel = "src/container.ts"
        }
        // If resolved to a .ts file that exists, keep as-is
        const isSrcModule = resolvedRel !== null && (resolvedRel.startsWith("src/"))
        const isExternal = typeof resolved === "string" && !resolved.startsWith(srcRoot)
        const isNext = isExternal && typeof resolved === "string" && resolved.startsWith("next/")
        const isPrisma = isExternal && typeof resolved === "string" && resolved.startsWith("@prisma/client")
        
        // Exceptions
        if (relPath === "src/api/container.ts" && specifier === "@/infrastructure/prisma/client") continue
        if (relPath === "src/api/webhooks.ts" && specifier === "@/integration/g2bulk/webhook-signature") continue
        if (relPath === "src/app/api/webhooks/g2bulk/route.ts" && specifier === "@/integration/g2bulk/webhook-signature") continue
        
        
        const sourceFeature = getFeatureFromPath(relPath)
        const targetFeature = resolvedRel ? getFeatureFromPath(resolvedRel) : null
        
        // Rule 5: UI boundary
        if (zone === "app" || zone === "frontend") {
          if (specifier === "@/container") { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (resolvedRel === "src/container.ts" || resolvedRel?.startsWith("src/container/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (resolvedRel?.startsWith("src/infrastructure")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (resolvedRel?.startsWith("src/integration")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (isPrisma) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (targetFeature) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        }
        
        // Rule 4: Purity
        if (sourceFeature && (isInFeatureLayer(relPath, "domain") || isInFeatureLayer(relPath, "ports"))) {
          if (isNext || isPrisma) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
          if (resolvedRel?.startsWith("src/env")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        }
        
        // Rule 3: Intra-feature layer direction
        if (sourceFeature && targetFeature && sourceFeature === targetFeature) {
          if (isInFeatureLayer(relPath, "domain")) {
            if (resolvedRel?.includes(`/${sourceFeature}/ports/`) || resolvedRel?.includes(`/${sourceFeature}/application/`)) {
              violations.push(`${relPath} → ${specifier} (rule)`); continue
            }
          }
          if (isInFeatureLayer(relPath, "ports")) {
            if (resolvedRel?.includes(`/${sourceFeature}/application/`)) {
              violations.push(`${relPath} → ${specifier} (rule)`); continue
            }
          }
        }
        
        // Rule 2: Cross-feature index-only
        if (targetFeature && !relPath.startsWith(`src/${targetFeature}/`) && (sourceFeature ? sourceFeature !== targetFeature : true)) {
          if (!isFeatureIndexImport(specifier, resolvedRel, targetFeature)) {
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
        }
        
        if (!isSrcModule) {
          if (zone === "shared" || zone === "env") continue
          continue
        }
        
        const targetZone = getZone(resolvedRel!)
        
        // Allow intra-zone imports within same major zone area (relative imports staying in same zone folder)
        // For api zone files in src/api, relative imports to other files in src/api are fine
        if ((zone === "api" && relPath.startsWith("src/api/")) && resolvedRel?.startsWith("src/api/")) {
          // Check it's not importing outside allowed - but intra-api is fine
          continue
        }
        if ((zone === "app" && !relPath.startsWith("src/app/api/")) && resolvedRel?.startsWith("src/app/") && !resolvedRel?.startsWith("src/app/api/")) {
          continue // allow relative imports within app pages area
        }
        if ((zone === "app/api") && resolvedRel?.startsWith("src/app/api/")) {
          continue
        }
        if (zone === "frontend" && (resolvedRel?.startsWith("src/frontend/"))) {
          continue // allow intra-frontend relative imports
        }
        if (zone === "infrastructure" && resolvedRel?.startsWith("src/infrastructure/")) {
          continue
        }
        if (zone === "integration" && resolvedRel?.startsWith("src/integration/")) {
          continue
        }
        if (zone === "i18n" && resolvedRel?.startsWith("src/i18n/")) {
          continue
        }
        if (zone === "shared" && resolvedRel?.startsWith("src/shared/")) {
          continue
        }
        if (zone === "env" && (resolvedRel === "src/env" || resolvedRel === "src/env.ts" || resolvedRel?.startsWith("src/env/"))) {
          continue
        }
        if (zone === "container" && (resolvedRel?.startsWith("src/container/") || resolvedRel === "src/container.ts")) {
          continue
        }
        
        // Rule 1: Zone matrix
        if (zone === "shared") {
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "env") {
          // The root config may read shared type/constant vocabulary; it may not read features/domain/application/infrastructure.
          if (resolvedRel?.startsWith("src/shared/")) {
            continue
          }
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone.startsWith("feature:")) {
          const featureName = zone.split(":")[1]
          if (resolvedRel?.startsWith("src/shared")) continue
          if (targetFeature && targetFeature !== featureName) {
            if (!isFeatureIndexImport(specifier, resolvedRel, targetFeature)) {
              violations.push(`${relPath} → ${specifier} (rule)`); continue
            }
          } else if (targetZone?.startsWith("feature:") && targetFeature === featureName) {
            continue
          } else if (resolvedRel && resolvedRel.startsWith("src/")) {
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
        } else if (zone === "frontend") {
          if (resolvedRel?.startsWith("src/api")) continue
          if (resolvedRel?.startsWith("src/i18n")) continue
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "api") {
          if (targetFeature) {
            if (isFeatureIndexImport(specifier, resolvedRel, targetFeature)) continue
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel?.startsWith("src/env")) continue
          if (resolvedRel === "src/container.ts") continue
          if (isNext) continue
          if (isPrisma) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "container") {
          if (targetFeature) {
            if (isFeatureIndexImport(specifier, resolvedRel, targetFeature)) continue
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
          if (resolvedRel?.startsWith("src/infrastructure")) continue
          if (resolvedRel?.startsWith("src/integration")) continue
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel?.startsWith("src/env")) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "infrastructure") {
          if (targetFeature) {
            if (isFeatureIndexImport(specifier, resolvedRel, targetFeature)) continue
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
          if (resolvedRel?.startsWith("src/shared")) continue
          if (isPrisma) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "integration") {
          if (targetFeature) {
            if (isFeatureIndexImport(specifier, resolvedRel, targetFeature)) continue
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "app") {
          if (resolvedRel?.startsWith("src/api")) continue
          if (resolvedRel?.startsWith("src/frontend")) continue
          if (resolvedRel?.startsWith("src/i18n")) continue
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        } else if (zone === "app/api") {
          if (resolvedRel?.startsWith("src/api")) continue
          if (targetFeature === "jobs") {
            if (isFeatureIndexImport(specifier, resolvedRel, "jobs")) continue
            violations.push(`${relPath} → ${specifier} (rule)`); continue
          }
          if (resolvedRel?.startsWith("src/shared")) continue
          if (resolvedRel?.startsWith("src/env")) continue
          if (resolvedRel && resolvedRel.startsWith("src/")) { violations.push(`${relPath} → ${specifier} (rule)`); continue }
        }
      }
    }
    
    if (violations.length > 0) {
      const total = violations.length
      const toReport = violations.slice(0, 50)
      const summary = total > 50 ? `\n... and ${total - 50} more violations (total: ${total})` : `\ntotal: ${total}`
      throw new Error(toReport.join("\n") + summary)
    }
  })
})
