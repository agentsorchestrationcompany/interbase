import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createHelperStdioConnection } from "@/computer-use/helper-stdio-connection"

describe("computer-use helper stdio connection", () => {
  test("keeps direct stdio helper process alive across serialized requests", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-stdio-test-"))
    const counterPath = join(dir, "starts.txt")
    const scriptPath = join(dir, "helper.js")
    writeFileSync(
      scriptPath,
      [
        "const fs = require('node:fs')",
        `fs.appendFileSync(${JSON.stringify(counterPath)}, 'started\\n')`,
        "let buffer = ''",
        "process.stdin.setEncoding('utf8')",
        "process.stdin.on('data', (chunk) => {",
        "  buffer += chunk",
        "  for (;;) {",
        "    const i = buffer.indexOf('\\n')",
        "    if (i === -1) break",
        "    const line = buffer.slice(0, i + 1)",
        "    buffer = buffer.slice(i + 1)",
        "    process.stdout.write(line)",
        "  }",
        "})",
      ].join("\n"),
    )
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 1_000 })
    const [first, second] = await Promise.all([connection.request("first\n"), connection.request("second\n")])
    expect(first).toBe("first\n")
    expect(second).toBe("second\n")
    expect(readFileSync(counterPath, "utf8").trim().split("\n")).toEqual(["started"])
    await connection.close?.()
  })

  test("keeps LaunchServices app helper alive across persistent file RPC requests", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-app-rpc-test-"))
    const counterPath = join(dir, "starts.txt")
    const scriptPath = join(dir, "open.js")
    writeFileSync(
      scriptPath,
      [
        "const fs = require('node:fs')",
        "const path = require('node:path')",
        "const requestDir = process.argv[process.argv.indexOf('--request-dir') + 1]",
        `fs.appendFileSync(${JSON.stringify(counterPath)}, 'started\\n')`,
        "setInterval(() => {",
        "  if (!fs.existsSync(requestDir)) process.exit(0)",
        "  for (const name of fs.readdirSync(requestDir).filter((item) => item.endsWith('.request'))) {",
        "    const requestPath = path.join(requestDir, name)",
        "    const responsePath = path.join(requestDir, name.replace(/\\.request$/, '.response'))",
        "    const request = fs.readFileSync(requestPath, 'utf8')",
        "    fs.rmSync(requestPath, { force: true })",
        "    fs.writeFileSync(responsePath, request)",
        "  }",
        "}, 5)",
      ].join("\n"),
    )
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], appPath: "Helper.app", launchMethod: "launchServicesPersistentFileRpc" }, { timeoutMs: 1_000 })
    const [first, second] = await Promise.all([connection.request("first\n"), connection.request("second\n")])
    expect(first).toBe("first\n")
    expect(second).toBe("second\n")
    expect(readFileSync(counterPath, "utf8").trim().split("\n")).toEqual(["started"])
    await connection.close?.()
  })

  test("rejects persistent app file RPC requests on timeout", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-app-rpc-timeout-test-"))
    const scriptPath = join(dir, "open.js")
    writeFileSync(scriptPath, "setInterval(() => {}, 1000)")
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], appPath: "Helper.app", launchMethod: "launchServicesPersistentFileRpc" }, { timeoutMs: 20 })
    await expect(connection.request("request\n")).rejects.toThrow("timed out")
    await connection.close?.()
  })

  test("rejects direct stdio requests after close", async () => {
    const connection = createHelperStdioConnection({ command: process.execPath, args: ["--version"], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 1_000 })
    await connection.close?.()
    await expect(connection.request("request\n")).rejects.toThrow("closed")
  })

  test("rejects direct stdio requests when the helper exits", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-stdio-exit-test-"))
    const scriptPath = join(dir, "helper.js")
    writeFileSync(scriptPath, "process.stderr.write('boom\\n'); process.exit(7)")
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 1_000 })
    await expect(connection.request("request\n")).rejects.toThrow("boom")
  })

  test("rejects direct stdio requests when spawning the helper fails", async () => {
    const connection = createHelperStdioConnection({ command: "/definitely/missing/interbase-helper", args: [], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 1_000 })
    await expect(connection.request("request\n")).rejects.toThrow(/ENOENT|no such file/i)
  })

  test("rejects direct stdio requests on timeout after partial output", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-stdio-timeout-test-"))
    const scriptPath = join(dir, "helper.js")
    writeFileSync(scriptPath, "process.stdin.on('data', () => process.stdout.write('partial'))")
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 20 })
    await expect(connection.request("request\n")).rejects.toThrow("timed out")
  })

  test("rejects a pending direct stdio request when closed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interbase-helper-stdio-close-test-"))
    const scriptPath = join(dir, "helper.js")
    writeFileSync(scriptPath, "process.stdin.resume()")
    const connection = createHelperStdioConnection({ command: process.execPath, args: [scriptPath], env: {}, warnings: [], launchMethod: "direct" }, { timeoutMs: 1_000 })
    const request = connection.request("request\n")
    await connection.close?.()
    await expect(request).rejects.toThrow("closed")
  })
})
