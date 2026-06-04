import { spawn } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"

type CapturedRequest = {
  readonly body: string
  readonly method: string | undefined
  readonly url: string | undefined
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

describe("CLI telemetry delivery", () => {
  test("flushes short-lived command telemetry before forced process exit", async () => {
    const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), "interbase-cli-analytics-"))
    const requests: CapturedRequest[] = []
    const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
      requests.push({
        body: await readRequestBody(request),
        method: request.method,
        url: request.url,
      })
      response.writeHead(204)
      response.end()
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected local server address")

    try {
      const child = spawn("bun", ["run", "--conditions=browser", "./src/index.ts", "analytics", "status"], {
        cwd: path.resolve(import.meta.dir, "../.."),
        env: {
          ...process.env,
          HOME: path.join(sandboxRoot, "home"),
          INTERBASE_API_URL: `http://127.0.0.1:${address.port}`,
          INTERBASE_TEST_SANDBOX_ROOT: sandboxRoot,
          XDG_CACHE_HOME: path.join(sandboxRoot, "cache"),
          XDG_CONFIG_HOME: path.join(sandboxRoot, "config"),
          XDG_DATA_HOME: path.join(sandboxRoot, "data"),
          XDG_STATE_HOME: path.join(sandboxRoot, "state"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      })

      const exitCode = await new Promise<number | null>((resolve) => child.on("exit", resolve))

      expect(exitCode).toBe(0)
      expect(requests).toHaveLength(1)
      expect(requests[0]).toMatchObject({
        method: "POST",
        url: "/api/cli/analytics/events",
      })
      expect(requests[0]!.body).toContain('"event":"analytics_status_viewed"')
      expect(requests[0]!.body).toContain('"cliEntrypoint":"command"')
      expect(requests[0]!.body).toContain('"version":1')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
