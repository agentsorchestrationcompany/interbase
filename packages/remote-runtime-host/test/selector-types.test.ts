import { test } from "bun:test"
import type { createRemoteRuntimeHostClient } from "../src/index.js"
import type { createRemoteRuntimeManager } from "../src/remote-runtime-manager.js"

function managerSelectorTypeAssertions() {
  const manager = null as unknown as ReturnType<typeof createRemoteRuntimeManager<{ directory: string }>>

  manager.runtimeDirectoriesSnapshot({ runtimeInstallationId: "rti_1" })
  manager.status({ all: true })
  manager.status({ runtimeInstallationId: "rti_1" })
  manager.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_1" })
  manager.readRemoteRuntimeChat({ directory: "/repo", sessionId: "ses_1" })
  manager.listRemoteRuntimeActiveChats({ runtimeInstallationId: "rti_1" })
  manager.listRemoteRuntimeActiveChats({ directoryId: "dir_1" })

  // @ts-expect-error empty selectors are not runtime-wide intent
  manager.runtimeDirectoriesSnapshot({})
  // @ts-expect-error directory-scoped methods require a directory selector
  manager.readRemoteRuntimeChat({ runtimeInstallationId: "rti_1", sessionId: "ses_1" })
  // @ts-expect-error directoryId and directory are intentionally mutually exclusive
  manager.readRemoteRuntimeChat({ directory: "/repo", directoryId: "dir_1", sessionId: "ses_1" })
  // @ts-expect-error all selectors cannot be mixed with installation selectors
  manager.status({ all: true, runtimeInstallationId: "rti_1" })
  // @ts-expect-error provider listing is directory-scoped
  manager.listRemoteRuntimeProviders({ runtimeInstallationId: "rti_1" })
  // @ts-expect-error git status needs an explicit projection selector
  manager.readRemoteRuntimeGitStatus()
}

function hostClientSelectorTypeAssertions() {
  const client = null as unknown as ReturnType<typeof createRemoteRuntimeHostClient>

  client.status({ all: true })
  client.status({ runtimeInstallationId: "rti_1" })
  client.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_1" })
  client.listRemoteRuntimeGoals({ runtimeInstallationId: "rti_1" })

  // @ts-expect-error empty status selectors are not accepted by the strict client API
  client.status({})
  // @ts-expect-error chat reads are directory-scoped
  client.readRemoteRuntimeChat({ runtimeInstallationId: "rti_1", sessionId: "ses_1" })
  // @ts-expect-error provider listing is directory-scoped
  client.listRemoteRuntimeProviders({ runtimeInstallationId: "rti_1" })
  // @ts-expect-error all selectors cannot be mixed with directory selectors
  client.stop({ all: true, directoryId: "dir_1" })
}

void managerSelectorTypeAssertions
void hostClientSelectorTypeAssertions

test("selector type assertions are compile-time only", () => undefined)
