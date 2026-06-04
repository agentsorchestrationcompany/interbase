import { afterEach, describe, expect, test } from "bun:test"
import { Flag } from "@interbase/core/flag/flag"
import { Server } from "../../src/server/server"
import { InstancePaths } from "../../src/server/routes/instance/httpapi/groups/instance"
import * as Log from "@interbase/core/util/log"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
import { waitGlobalBusEventPromise } from "./global-bus"

void Log.init({ print: false })

const original = Flag.INTERBASE_EXPERIMENTAL_HTTPAPI

function app() {
  Flag.INTERBASE_EXPERIMENTAL_HTTPAPI = true
  return Server.Default().app
}

function legacyApp() {
  Flag.INTERBASE_EXPERIMENTAL_HTTPAPI = false
  return Server.Legacy().app
}

async function waitDisposed(directory: string) {
  await waitGlobalBusEventPromise({
    message: "timed out waiting for instance disposal",
    predicate: (event) => event.payload.type === "server.instance.disposed" && event.directory === directory,
  })
}

afterEach(async () => {
  Flag.INTERBASE_EXPERIMENTAL_HTTPAPI = original
  await disposeAllInstances()
  await resetDatabase()
})

describe("instance HttpApi", () => {
  test("serves legacy Hono routes with request instance context", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const response = await legacyApp().request("/path", { headers: { "x-interbase-directory": tmp.path } })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ directory: tmp.path })
  })

  test("serves catalog read endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const [commands, agents, skills, lsp, formatter] = await Promise.all([
      app().request(InstancePaths.command, { headers: { "x-interbase-directory": tmp.path } }),
      app().request(InstancePaths.agent, { headers: { "x-interbase-directory": tmp.path } }),
      app().request(InstancePaths.skill, { headers: { "x-interbase-directory": tmp.path } }),
      app().request(InstancePaths.lsp, { headers: { "x-interbase-directory": tmp.path } }),
      app().request(InstancePaths.formatter, { headers: { "x-interbase-directory": tmp.path } }),
    ])

    expect(commands.status).toBe(200)
    expect(await commands.json()).not.toContainEqual(expect.objectContaining({ name: "init", source: "command" }))

    expect(agents.status).toBe(200)
    expect(await agents.json()).toContainEqual(expect.objectContaining({ name: "build", mode: "primary" }))

    expect(skills.status).toBe(200)
    expect(await skills.json()).toBeArray()

    expect(lsp.status).toBe(200)
    expect(await lsp.json()).toEqual([])

    expect(formatter.status).toBe(200)
    expect(await formatter.json()).toEqual([])
  })

  test("serves project git init through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })
    const disposed = waitDisposed(tmp.path)

    const response = await app().request("/project/git/init", {
      method: "POST",
      headers: { "x-interbase-directory": tmp.path },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ vcs: "git", worktree: tmp.path })
    await disposed

    const current = await app().request("/project/current", { headers: { "x-interbase-directory": tmp.path } })
    expect(current.status).toBe(200)
    expect(await current.json()).toMatchObject({ vcs: "git", worktree: tmp.path })
  })

  test("serves project update through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const current = await app().request("/project/current", { headers: { "x-interbase-directory": tmp.path } })
    expect(current.status).toBe(200)
    const project = (await current.json()) as { id: string }

    const response = await app().request(`/project/${project.id}`, {
      method: "PATCH",
      headers: { "x-interbase-directory": tmp.path, "content-type": "application/json" },
      body: JSON.stringify({ name: "patched-project", commands: { start: "bun dev" } }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: project.id,
      name: "patched-project",
      commands: { start: "bun dev" },
    })

    const list = await app().request("/project", { headers: { "x-interbase-directory": tmp.path } })
    expect(list.status).toBe(200)
    expect(await list.json()).toContainEqual(
      expect.objectContaining({ id: project.id, name: "patched-project", commands: { start: "bun dev" } }),
    )
  })

  test("serves instance dispose through Hono bridge", async () => {
    await using tmp = await tmpdir()

    const disposed = waitGlobalBusEventPromise({
      message: "timed out waiting for instance disposal",
      predicate: (event) => event.payload.type === "server.instance.disposed",
    })

    const response = await app().request(InstancePaths.dispose, {
      method: "POST",
      headers: { "x-interbase-directory": tmp.path },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toBe(true)
    expect((await disposed).directory).toBe(tmp.path)
  })
})
