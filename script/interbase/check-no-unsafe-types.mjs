#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import ts from "typescript"

const sourceExtensions = [".ts", ".tsx", ".mts", ".cts"]
const defaultMaxReport = 200
const maxReport = Number.parseInt(process.env.INTERBASE_UNSAFE_TYPE_REPORT_LIMIT ?? String(defaultMaxReport), 10)

const ignoredPrefixes = []

const ignoredSegments = new Set([
  ".build",
  ".tanstack",
  ".turbo",
  ".wrangler",
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
])

const schemaModuleSpecifiers = new Set(["effect", "effect/Schema", "zod"])

const schemaFactoryNames = new Set(["any", "unknown"])
const schemaPropertyNames = new Set(["Any", "Unknown"])

function trackedSourceFiles() {
  const result = spawnSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ...sourceExtensions.map((extension) => `*${extension}`),
    ],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || "Unable to list tracked TypeScript files")
  }
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((filePath) => !ignoredPrefixes.some((prefix) => filePath.startsWith(prefix)))
    .filter((filePath) => !filePath.split("/").some((segment) => ignoredSegments.has(segment)))
}

function scriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX
  if (filePath.endsWith(".mts")) return ts.ScriptKind.TS
  if (filePath.endsWith(".cts")) return ts.ScriptKind.TS
  return ts.ScriptKind.TS
}

function sourcePosition(sourceFile, position) {
  const location = sourceFile.getLineAndCharacterOfPosition(position)
  return `${sourceFile.fileName}:${location.line + 1}:${location.character + 1}`
}

function importedSchemaIdentifiers(sourceFile) {
  const identifiers = new Set()
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (!schemaModuleSpecifiers.has(statement.moduleSpecifier.text)) continue
    const clause = statement.importClause
    if (!clause) continue
    if (clause.name && statement.moduleSpecifier.text === "zod") identifiers.add(clause.name.text)
    const namedBindings = clause.namedBindings
    if (!namedBindings) continue
    if (ts.isNamespaceImport(namedBindings)) {
      identifiers.add(namedBindings.name.text)
      continue
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text
      if (importedName === "z" || importedName === "Schema") identifiers.add(element.name.text)
    }
  }
  return identifiers
}

function schemaExpressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text
  return null
}

function collectViolations(filePath) {
  const source = readFileSync(filePath, "utf8")
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath))
  const schemaIdentifiers = importedSchemaIdentifiers(sourceFile)
  const violations = []

  function add(node, message) {
    violations.push(`${sourcePosition(sourceFile, node.getStart(sourceFile))} ${message}`)
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      add(node, "explicit TypeScript any is prohibited; use a precise contract type")
    }
    if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      add(node, "explicit TypeScript unknown is prohibited; use a precise contract type")
    }
    if (ts.isPropertyAccessExpression(node)) {
      const owner = schemaExpressionName(node.expression)
      if (owner && schemaIdentifiers.has(owner) && schemaPropertyNames.has(node.name.text)) {
        add(node.name, `schema placeholder ${owner}.${node.name.text} is prohibited; use a precise schema`)
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const owner = schemaExpressionName(node.expression.expression)
      if (owner && schemaIdentifiers.has(owner) && schemaFactoryNames.has(node.expression.name.text)) {
        add(
          node.expression.name,
          `schema placeholder ${owner}.${node.expression.name.text}() is prohibited; use a precise schema`,
        )
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

const violations = trackedSourceFiles().flatMap(collectViolations)

if (violations.length > 0) {
  console.error(`Unsafe TypeScript type usage is prohibited. Found ${violations.length} violation(s).`)
  for (const violation of violations.slice(
    0,
    Number.isFinite(maxReport) && maxReport > 0 ? maxReport : defaultMaxReport,
  )) {
    console.error(`- ${violation}`)
  }
  if (violations.length > maxReport) {
    console.error(`- ... ${violations.length - maxReport} more violation(s) not shown`)
  }
  process.exit(1)
}

console.log("No unsafe TypeScript any/unknown usage found.")
