import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../../fixture/fixture"
import { resolveThreadDirectory } from "../../../src/cli/cmd/tui/thread"
import { shouldDeliverProjectEvent } from "../../../src/cli/cmd/tui/context/event"

describe("tui thread", () => {
  async function check(project?: string) {
    await using tmp = await tmpdir({ git: true })
    const link = path.join(path.dirname(tmp.path), path.basename(tmp.path) + "-link")
    const type = process.platform === "win32" ? "junction" : "dir"

    try {
      await fs.symlink(tmp.path, link, type)
      expect(resolveThreadDirectory(project, link, tmp.path)).toBe(tmp.path)
    } finally {
      await fs.rm(link, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  test("uses the real cwd when PWD points at a symlink", async () => {
    await check()
  })

  test("uses the real cwd after resolving a relative project from PWD", async () => {
    await check(".")
  })

  test("delivers host events for the active directory", () => {
    expect(shouldDeliverProjectEvent({ directory: "/runtime-host/repo" }, { directory: "/visible-cli/repo" })).toBe(
      false,
    )
    expect(shouldDeliverProjectEvent({ directory: "/repo" }, { directory: "/repo" })).toBe(true)
    expect(shouldDeliverProjectEvent({ directory: "/repo" }, { directory: "/repo", project: "project_1" })).toBe(true)
  })
})
