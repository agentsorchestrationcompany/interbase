import { describe, expect, test } from "bun:test"
import yargs from "yargs"
import { createRemoteRuntimeCommand } from "../../src/cli/cmd/remote-runtime"
import { ACTIVE_FEATURE_BUNDLES, createFeatureAssembly } from "../../src/feature/assembly"
import { createProviderRemoteRuntimeFeatureBundle } from "../../src/feature/provider-remote-runtime"
import { PUBLIC_ACCOUNT_FEATURE_BUNDLE } from "../../src/feature/public-account"
import { PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE } from "../../src/feature/public-remote-runtime"
import { CLI_EXTENSION_FEATURE_BUNDLES, extensionInvocation } from "../fixture/provider-feature-extension"
import {
  assembleFeatureBundles,
  featureBundleCommandTrees,
  featureBundleCommands,
  resolveFeatureBundles,
} from "../../src/feature/bundle"

describe("feature bundle assembly", () => {
  test("includes public feature bundles in the active feature graph", () => {
    expect(ACTIVE_FEATURE_BUNDLES.map((bundle) => bundle.id)).toEqual([
      "public-account-authority",
      "public-remote-runtime",
    ])
  })

  test("creates an explicit feature assembly object from supplied bundle inputs", () => {
    const assembly = createFeatureAssembly({
      publicBundles: [{ id: "public-remote-runtime", kind: "public", commands: [] }],
      extensionBundles: [
        { id: "provider-remote-runtime", kind: "hosted", commandTrees: [{ root: "remote", commands: [] }] },
      ],
    })

    expect(assembly.bundles.map((bundle) => bundle.id)).toEqual(["public-remote-runtime", "provider-remote-runtime"])
    expect(assembly.commandsByKind("hosted")).toEqual([])
  })

  test("assembles explicit feature bundles without a legacy compatibility seam", async () => {
    const explicit = {
      id: "explicit",
      commands: [
        {
          command: "remote",
          load: async () => ({ command: "remote", describe: "explicit", handler() {} }),
        },
      ],
    } as const

    const bundles = resolveFeatureBundles({ bundles: [explicit] })

    expect(bundles).toEqual([explicit])
    expect(featureBundleCommands(bundles).map((entry) => entry.command)).toEqual(["remote"])
  })

  test("rejects duplicate feature bundle ids", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [{ id: "duplicate" }, { id: "duplicate" }],
      }),
    ).toThrow("Duplicate feature bundle id: duplicate")
  })

  test("rejects feature bundles that replace a missing bundle id", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [{ id: "provider-remote-runtime", replaces: ["public-remote-runtime"] }],
      }),
    ).toThrow("Feature bundle provider-remote-runtime replaces missing bundle public-remote-runtime")
  })

  test("rejects conflicting command owners without replacement", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [
          {
            id: "public-remote",
            commands: [
              {
                command: "remote",
                names: ["remote", "mobile"],
                load: async () => ({ command: "remote", describe: "public", handler() {} }),
              },
            ],
          },
          {
            id: "provider-remote",
            commands: [
              {
                command: "remote",
                names: ["remote", "mobile"],
                load: async () => ({ command: "remote", describe: "hosted", handler() {} }),
              },
            ],
          },
        ],
      }),
    ).toThrow("Feature bundle provider-remote conflicts on command name remote with public-remote")
  })

  test("allows command ownership replacement when declared", () => {
    const bundles = resolveFeatureBundles({
      bundles: [
        {
          id: "public-remote",
          commands: [
            {
              command: "remote",
              names: ["remote", "mobile"],
              load: async () => ({ command: "remote", describe: "public", handler() {} }),
            },
          ],
        },
        {
          id: "provider-remote",
          replaces: ["public-remote"],
          commands: [
            {
              command: "remote",
              names: ["remote", "mobile"],
              load: async () => ({ command: "remote", describe: "hosted", handler() {} }),
            },
          ],
        },
      ],
    })

    expect(bundles.map((bundle) => bundle.id)).toEqual(["public-remote", "provider-remote"])
  })

  test("rejects conflicting authority seams without replacement", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [
          { id: "public-account", authoritySeams: ["provider-account-authority"] },
          { id: "public-account-override", authoritySeams: ["provider-account-authority"] },
        ],
      }),
    ).toThrow(
      "Feature bundle public-account-override conflicts on authority seam provider-account-authority with public-account",
    )
  })

  test("rejects conflicting api surfaces without replacement", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [
          { id: "alpha-public", apiSurfaces: ["alpha"] },
          { id: "alpha-hosted", apiSurfaces: ["alpha"] },
        ],
      }),
    ).toThrow("Feature bundle alpha-hosted conflicts on api surface alpha with alpha-public")
  })

  test("rejects conflicting route groups without replacement", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [
          { id: "alpha-public", routeGroups: ["alpha"] },
          { id: "alpha-hosted", routeGroups: ["alpha"] },
        ],
      }),
    ).toThrow("Feature bundle alpha-hosted conflicts on route group alpha with alpha-public")
  })

  test("runs bundle invariants during assembly validation", () => {
    expect(() =>
      resolveFeatureBundles({
        bundles: [
          {
            id: "invariant-test",
            invariants: [
              () => {
                throw new Error("invariant failed")
              },
            ],
          },
        ],
      }),
    ).toThrow("invariant failed")
  })

  test("collects shared-root command tree extensions by root name", () => {
    const commands = featureBundleCommandTrees(
      [
        {
          id: "provider-remote",
          commandTrees: [
            {
              root: "remote",
              commands: [{ command: "setup", describe: "setup", handler() {} }],
            },
          ],
        },
      ],
      "remote",
    )

    expect(commands.map((command) => command.command)).toEqual(["setup"])
  })

  test("public account feature bundle publishes disabled-compatibility metadata", () => {
    expect(PUBLIC_ACCOUNT_FEATURE_BUNDLE.disabledCompatibility).toEqual([
      "active-none",
      "active-org-none",
      "list-empty",
      "token-none",
      "provider-login-unavailable",
      "provider-signup-unavailable",
    ])
  })

  test("provides a hosted remote feature bundle factory that attaches remote subtree commands", () => {
    const bundle = createProviderRemoteRuntimeFeatureBundle({
      remoteCommandTree: [{ command: "setup", describe: "setup", handler() {} }],
    })

    expect(bundle.id).toBe("provider-remote-runtime")
    expect(bundle.kind).toBe("hosted")
    expect(bundle.dependsOn).toBeUndefined()
    expect(bundle.commandTrees?.[0]?.root).toBe("remote")
    expect(bundle.commandTrees?.[0]?.commands.map((command) => command.command)).toEqual(["setup"])
  })

  test("hosted remote feature bundle replaces the public remote root when it supplies a root command", () => {
    const bundle = createProviderRemoteRuntimeFeatureBundle({
      commands: [
        {
          command: "remote",
          names: ["remote", "mobile"],
          load: async () => ({ command: "remote", handler() {} }),
        },
      ],
    })

    expect(bundle.replaces).toEqual(["public-remote-runtime"])
    expect(bundle.commands?.map((command) => command.command)).toEqual(["remote"])

    expect(() =>
      assembleFeatureBundles({
        publicBundles: [PUBLIC_ACCOUNT_FEATURE_BUNDLE, PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE],
        extensionBundles: [bundle],
      }),
    ).not.toThrow()
  })

  test("hosted remote feature bundle can assemble alongside the public remote root without command collision", () => {
    const bundles = assembleFeatureBundles({
      publicBundles: [PUBLIC_ACCOUNT_FEATURE_BUNDLE, PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE],
      extensionBundles: [
        createProviderRemoteRuntimeFeatureBundle({
          remoteCommandTree: [{ command: "setup", describe: "setup", handler() {} }],
        }),
      ],
    })

    expect(bundles.map((bundle) => bundle.id)).toEqual([
      "public-account-authority",
      "public-remote-runtime",
      "provider-remote-runtime",
    ])
    expect(featureBundleCommandTrees(bundles, "remote").map((command) => command.command)).toEqual(["setup"])
  })

  test("assembles bundles exported by a synthetic hosted extension module", async () => {
    extensionInvocation.called = false
    const assembly = createFeatureAssembly({
      publicBundles: [
        PUBLIC_ACCOUNT_FEATURE_BUNDLE,
        PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE,
      ],
      extensionBundles: CLI_EXTENSION_FEATURE_BUNDLES,
    })

    expect(assembly.bundles.map((bundle) => bundle.id)).toContain("provider-remote-runtime")

    const command = createRemoteRuntimeCommand(assembly.commandTree("remote"))
    await yargs([])
      .exitProcess(false)
      .command(command as never)
      .parseAsync(["remote", "setup"])
    expect(extensionInvocation.called).toBe(true)
  })
})
