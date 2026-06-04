import { describe, expect, test } from "bun:test"
import { rmSync } from "fs"
import path from "path"
import { Global } from "@interbase/core/global"
import { InstallationChannel } from "@interbase/core/installation/version"
import { ProjectTable } from "@/project/project.sql"
import { ProjectID } from "@/project/schema"
import { Database } from "@/storage/db"
import { SessionID } from "@/session/schema"
import { SessionTable } from "@/session/session.sql"

describe("Database.Path", () => {
  test("returns database path for the current channel", () => {
    const expected = ["latest", "beta"].includes(InstallationChannel)
      ? path.join(Global.Path.data, "interbase.db")
      : path.join(Global.Path.data, `interbase-${InstallationChannel.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
    expect(Database.getChannelPath()).toBe(expected)
  })

  test("resolves explicit session IDs across channel databases", () => {
    const current = path.join(Global.Path.data, "interbase-test-current.db")
    const alternate = path.join(Global.Path.data, "interbase-test-alternate.db")
    const projectID = ProjectID.make("proj_test")
    const sessionID = SessionID.make("ses_20a984a51ffeiNun92prN2LI52")
    rmSync(current, { force: true })
    rmSync(alternate, { force: true })
    Database.usePath(current, () => undefined)
    Database.transactionPath(alternate, (db) => {
      db.insert(ProjectTable)
        .values([
          {
            id: projectID,
            worktree: "/tmp",
            vcs: "git",
            name: null,
            icon_url: null,
            icon_url_override: null,
            icon_color: null,
            time_created: Date.now(),
            time_updated: Date.now(),
            time_initialized: null,
            sandboxes: [],
            commands: null,
          },
        ])
        .run()
      db.insert(SessionTable)
        .values([
          {
            id: sessionID,
            project_id: projectID,
            parent_id: null,
            slug: "",
            directory: "/tmp",
            path: null,
            title: "test",
            version: "test",
            share_url: null,
            summary_additions: null,
            summary_deletions: null,
            summary_files: null,
            summary_diffs: null,
            revert: null,
            permission: null,
            time_created: Date.now(),
            time_updated: Date.now(),
            time_compacting: null,
            time_archived: null,
            agent: null,
            model: null,
          },
        ])
        .run()
    })

    expect(Database.resolveSessionPath(sessionID, current)).toBe(alternate)

    Database.close(current)
    Database.close(alternate)
    rmSync(current, { force: true })
    rmSync(alternate, { force: true })
  })
})
