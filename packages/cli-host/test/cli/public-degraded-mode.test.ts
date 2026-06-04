import { Flag } from "@interbase/core/flag/flag"
import { afterEach, describe, expect, test } from "bun:test"

import { INTERBASE_CLI_COMMANDS } from "../../src/cli/command-registry"
import { Server } from "../../src/server/server"

const originalServerConfig = {
  experimentalHttpApi: Flag.INTERBASE_EXPERIMENTAL_HTTPAPI,
  serverPassword: Flag.INTERBASE_SERVER_PASSWORD,
  serverUsername: Flag.INTERBASE_SERVER_USERNAME,
  envPassword: process.env.INTERBASE_SERVER_PASSWORD,
  envUsername: process.env.INTERBASE_SERVER_USERNAME,
}

afterEach(() => {
  Flag.INTERBASE_EXPERIMENTAL_HTTPAPI = originalServerConfig.experimentalHttpApi
  Flag.INTERBASE_SERVER_PASSWORD = originalServerConfig.serverPassword
  Flag.INTERBASE_SERVER_USERNAME = originalServerConfig.serverUsername
  if (originalServerConfig.envPassword === undefined) delete process.env.INTERBASE_SERVER_PASSWORD
  else process.env.INTERBASE_SERVER_PASSWORD = originalServerConfig.envPassword
  if (originalServerConfig.envUsername === undefined) delete process.env.INTERBASE_SERVER_USERNAME
  else process.env.INTERBASE_SERVER_USERNAME = originalServerConfig.envUsername
})

describe("public degraded mode", () => {
  test("keeps the public command list on the documented registry seam", () => {
    expect(INTERBASE_CLI_COMMANDS.length).toBeGreaterThan(0)
    expect(INTERBASE_CLI_COMMANDS.map((command) => command.command)).toContain("$0 [project]")
    expect(INTERBASE_CLI_COMMANDS.map((command) => command.command)).toContain("doctor")
  })

  test("starts the public server with only public wiring", async () => {
    Flag.INTERBASE_EXPERIMENTAL_HTTPAPI = false
    Flag.INTERBASE_SERVER_PASSWORD = undefined
    Flag.INTERBASE_SERVER_USERNAME = "interbase"
    delete process.env.INTERBASE_SERVER_PASSWORD
    process.env.INTERBASE_SERVER_USERNAME = "interbase"

    const listener = await Server.listen({ hostname: "127.0.0.1", port: 0 })
    try {
      const response = await fetch(new URL("/global/health", listener.url))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ healthy: true })
    } finally {
      await listener.stop(true)
    }
  })
})
