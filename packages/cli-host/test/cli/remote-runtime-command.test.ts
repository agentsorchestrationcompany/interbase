import { describe, expect, test } from "bun:test"
import yargs from "yargs"
import { createFeatureAssembly } from "../../src/feature/assembly"
import { createProviderRemoteRuntimeFeatureBundle } from "../../src/feature/provider-remote-runtime"
import { PUBLIC_ACCOUNT_FEATURE_BUNDLE } from "../../src/feature/public-account"
import { PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE } from "../../src/feature/public-remote-runtime"
import {
  createRemoteRuntimeCommand,
  createPublicRemoteRuntimeHostComposition,
  RemoteRuntimeCommand,
  remoteRuntimeStatusPayload,
} from "../../src/cli/cmd/remote-runtime"

describe("remote runtime command", () => {
  test("registers a visible remote runtime command", () => {
    expect(RemoteRuntimeCommand.command).toBe("remote")
    expect(RemoteRuntimeCommand.aliases).toBe("mobile")
    expect(RemoteRuntimeCommand.describe).toBe("Manage remote runtime connectivity")
  })

  test("composes the public local-direct remote runtime capability by default", async () => {
    const composition = createPublicRemoteRuntimeHostComposition()
    expect(composition.selection).toEqual({
      enabled: true,
      mode: "localDirect",
      adapterId: "local-direct",
      entitlementProviderId: "allowAll",
    })
    expect(composition.adapter?.id).toBe("local-direct")
    await expect(
      composition.entitlements.isAllowed("command", { environment: "oss", mode: "localDirect" }),
    ).resolves.toEqual({ allowed: true })
  })

  test("formats remote runtime status from resolved composition", () => {
    expect(remoteRuntimeStatusPayload()).toEqual({
      enabled: true,
      mode: "localDirect",
      adapterId: "local-direct",
      entitlementProviderId: "allowAll",
    })
    expect(
      remoteRuntimeStatusPayload({
        selection: { enabled: false, mode: "disabled", entitlementProviderId: "disabled" },
        entitlements: createPublicRemoteRuntimeHostComposition().entitlements,
      }),
    ).toEqual({ enabled: false, mode: "disabled", adapterId: null, entitlementProviderId: "disabled" })
  })

  test("attaches hosted remote subtree commands when provided explicitly", async () => {
    let called = false
    const command = createRemoteRuntimeCommand([
      {
        command: "setup",
        describe: "hosted setup",
        handler() {
          called = true
        },
      },
    ])

    await yargs([])
      .exitProcess(false)
      .command(command as never)
      .parseAsync(["remote", "setup"])
    expect(called).toBe(true)
  })

  test("executes hosted remote subtree commands from the hosted remote feature bundle assembly path", async () => {
    let called = false
    const assembly = createFeatureAssembly({
      publicBundles: [PUBLIC_ACCOUNT_FEATURE_BUNDLE, PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE],
      extensionBundles: [
        createProviderRemoteRuntimeFeatureBundle({
          remoteCommandTree: [
            {
              command: "setup",
              describe: "hosted setup",
              handler() {
                called = true
              },
            },
          ],
        }),
      ],
    })

    const command = createRemoteRuntimeCommand(assembly.commandTree("remote"))
    await yargs([])
      .exitProcess(false)
      .command(command as never)
      .parseAsync(["remote", "setup"])
    expect(called).toBe(true)
  })
})
