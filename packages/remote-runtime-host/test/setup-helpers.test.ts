import { describe, expect, test } from "bun:test"
import { serializeRemoteRuntimeAsymmetricPublicKey } from "@interbase/remote-runtime-contracts"
import {
  type RemoteRuntimeHostState,
  configureRemoteRuntimeSetupRuntimeEncryptionOnHost,
  createRemoteRuntimeSetupKeyProof,
  createRemoteRuntimeSetupKeyProofAuthority,
  createRemoteRuntimeSetupLocalRuntimeCredential,
  createRemoteRuntimeSetupRuntimeKeyPair,
  installRemoteRuntimeSetupRuntimeLaunchAgent,
  readRemoteRuntimeLogsFromHost,
  readRemoteRuntimeStatusFromHost,
  remoteRuntimeSetupMatchingRuntimeStatuses,
  remoteRuntimeSetupRuntimeEncryptionKey,
  resolveRemoteRuntimeSetupLocalRuntimeIdentity,
  resolveRemoteRuntimeStartConfiguration,
  stopRemoteRuntimeOnHost,
} from "../src/index.js"

describe("remote runtime host setup helpers", () => {
  test("matches setup runtimes by enabled directory authority and preserves local runtime identity", () => {
    expect(
      remoteRuntimeSetupMatchingRuntimeStatuses({
        directories: [
          {
            addedAt: "2026-05-17T00:00:00.000Z",
            directoryId: "dir_1",
            enabled: true,
            path: "/repo",
            updatedAt: "2026-05-17T00:00:00.000Z",
          },
          {
            addedAt: "2026-05-17T00:00:00.000Z",
            directoryId: "dir_disabled",
            enabled: false,
            path: "/disabled",
            updatedAt: "2026-05-17T00:00:00.000Z",
          },
        ],
        statuses: [
          { allowedDirectories: [{ directoryId: "dir_other", path: "/other" }], runtimeInstallationId: "rti_other", state: "online" },
          { allowedDirectories: [{ directoryId: "dir_moved", path: "/repo" }], runtimeInstallationId: "rti_path", state: "online" },
          { allowedDirectories: [{ directoryId: "dir_disabled", path: "/disabled" }], runtimeInstallationId: "rti_disabled", state: "online" },
          { allowedDirectories: [{ directoryId: "dir_1", path: "/repo-old" }], runtimeInstallationId: "rti_id", state: "online" },
        ],
      }).map((status) => status.runtimeInstallationId),
    ).toEqual(["rti_path", "rti_id"])

    const existingState = { localRuntimeIdentityId: "lri_existing" }
    expect(
      resolveRemoteRuntimeSetupLocalRuntimeIdentity({
        randomUUID: () => {
          throw new Error("existing identity should be reused")
        },
        state: existingState,
      }),
    ).toEqual({
      localRuntimeIdentityId: "lri_existing",
      shouldWriteState: false,
      state: existingState,
    })

    const stateWithoutIdentity: RemoteRuntimeHostState = {
      runtime: {
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
        state: "stopped",
      },
    }

    expect(
      resolveRemoteRuntimeSetupLocalRuntimeIdentity({
        randomUUID: () => "uuid_1",
        state: stateWithoutIdentity,
      }),
    ).toEqual({
      localRuntimeIdentityId: "lri_uuid_1",
      shouldWriteState: true,
      state: {
        localRuntimeIdentityId: "lri_uuid_1",
        runtime: {
          accountId: "account_1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          directoryId: "dir_1",
          runtimeInstallationId: "rti_1",
          state: "stopped",
        },
      },
    })
  })

  test("creates setup key material, local runtime credentials, and derived encryption keys", async () => {
    const uuids = ["credential_secret", "credential_id", "runtime_key", "proof_nonce", "proof_authority_nonce"]
    const deps = {
      now: () => "2026-05-17T00:00:00.000Z",
      randomUUID: () => {
        const next = uuids.shift()
        if (!next) throw new Error("unexpected uuid request")
        return next
      },
    }

    expect(createRemoteRuntimeSetupLocalRuntimeCredential(deps)).toEqual({
      localRuntimeAccessToken: "lrt_credential_secret",
      localRuntimeAccessTokenId: "lrtid_credential_id",
    })

    const keyPair = await createRemoteRuntimeSetupRuntimeKeyPair("runtimeResponseSigning", deps)
    expect(keyPair.publicKey).toMatchObject({
      createdAt: "2026-05-17T00:00:00.000Z",
      keyId: "mk_runtime_key",
      purpose: "runtimeResponseSigning",
    })
    expect(keyPair.serializedPublicKey).toBe(serializeRemoteRuntimeAsymmetricPublicKey(keyPair.publicKey))

    await expect(
      createRemoteRuntimeSetupKeyProof(
        {
          challengeId: null,
          connectorVersion: "1.0.0",
          deviceName: null,
          keyPair,
          runtimeInstallationId: null,
        },
        deps,
      ),
    ).resolves.toMatchObject({
      algorithm: "ed25519",
      keyId: "mk_runtime_key",
      nonce: "nonce_proof_nonce",
      timestamp: "2026-05-17T00:00:00.000Z",
    })

    await expect(
      createRemoteRuntimeSetupKeyProofAuthority(
        {
          challengeId: null,
          connectorVersion: "1.0.0",
          deviceName: null,
          keyPair,
          runtimeInstallationId: null,
        },
        deps,
      ),
    ).resolves.toMatchObject({
      keyProof: {
        algorithm: "ed25519",
        keyId: "mk_runtime_key",
        nonce: "nonce_proof_authority_nonce",
        timestamp: "2026-05-17T00:00:00.000Z",
      },
      publicKey: keyPair.serializedPublicKey,
    })

    expect(await remoteRuntimeSetupRuntimeEncryptionKey("mst_1")).toEqual({
      keyBase64: "HIPEc-IQbmhNWb7His_JFsrE7QATVU23trLwcBB5J2Q",
      keyId: "client_setup_token:v1",
    })
  })

  test("resolves remote runtime start configuration from matching state", () => {
    const directories = [{ directoryId: "dir_1", enabled: true, path: "/repo" }] as const

    expect(() =>
      resolveRemoteRuntimeStartConfiguration({
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        directories,
        state: {},
      }),
    ).toThrow("Remote runtime start requires an active Interbase CLI login")

    expect(() =>
      resolveRemoteRuntimeStartConfiguration({
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "api-token",
        directories,
        state: {},
      }),
    ).toThrow("Remote runtime start requires --runtime-installation-id")

    expect(() =>
      resolveRemoteRuntimeStartConfiguration({
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "api-token",
        directories,
        requestedRuntimeInstallationId: "rti_1",
        state: {
          runtime: {
            accountId: "account_1",
            apiBaseUrl: "https://api.example.test",
            directory: "/repo",
            directoryId: "dir_1",
            runtimeInstallationId: "rti_1",
          },
        },
      }),
    ).toThrow("Remote runtime start requires encrypted chat pairing state")

    expect(
      resolveRemoteRuntimeStartConfiguration({
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "api-token",
        directories,
        state: {
          runtime: {
            accountId: "account_1",
            apiBaseUrl: "https://api.example.test",
            directory: "/repo",
            directoryId: "dir_1",
            localGatewayAuthority: { trustedRuntimeClientId: "device_1" },
            runtimeEncryptionKey: { keyBase64: "secret", keyId: "key_1" },
            runtimeInstallationId: "rti_1",
          },
        },
      }),
    ).toEqual({
      accountId: "account_1",
      apiBaseUrl: "https://api.example.test",
      authorizationToken: "api-token",
      directories,
      localGatewayAuthority: { trustedRuntimeClientId: "device_1" },
      runtimeEncryptionKey: { keyBase64: "secret", keyId: "key_1" },
      runtimeInstallationId: "rti_1",
    })
  })

  test("reads status and logs from the host when available", async () => {
    const host = { pid: 42, url: "http://127.0.0.1:4096" }
    const statuses = [
      {
        accountId: "account_1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        runtimeInstallationId: "rti_1",
        state: "online",
      },
    ]
    const logs = [{ level: "info", message: "started", timestamp: "2026-05-17T00:00:00.000Z" }]

    await expect(
      readRemoteRuntimeStatusFromHost({
        hostClient() {
          throw new Error("missing host should not create a client")
        },
        async readHost() {
          return undefined
        },
      }),
    ).resolves.toEqual([])

    await expect(
      readRemoteRuntimeLogsFromHost({
        hostClient() {
          throw new Error("missing host should not create a client")
        },
        async readHost() {
          return undefined
        },
      }),
    ).resolves.toEqual([])

    await expect(
      readRemoteRuntimeStatusFromHost({
        hostClient(receivedHost) {
          expect(receivedHost).toEqual(host)
          return {
            logs: async () => [],
            status: async () => statuses,
          }
        },
        async readHost() {
          return host
        },
      }),
    ).resolves.toEqual(statuses)

    await expect(
      readRemoteRuntimeLogsFromHost({
        hostClient(receivedHost) {
          expect(receivedHost).toEqual(host)
          return {
            status: async () => [],
            logs: async () => logs,
          }
        },
        async readHost() {
          return host
        },
      }),
    ).resolves.toEqual(logs)
  })

  test("manages setup runtime lifecycle helpers on the host", async () => {
    const writes: RemoteRuntimeHostState[] = []
    await expect(
      configureRemoteRuntimeSetupRuntimeEncryptionOnHost(
        {
          ensureHost: async () => ({ url: "http://127.0.0.1:4096" }),
          hostClient() {
            return {
              configureEncryption: async () => [
                {
                  accountId: "account_1",
                  allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
                  apiBaseUrl: "https://api.example.test",
                  runtimeInstallationId: "rti_1",
                  state: "online",
                },
              ],
            }
          },
          async readState() {
            return {
              runtime: {
                accountId: "account_1",
                apiBaseUrl: "https://api.example.test",
                directory: "/repo",
                directoryId: "dir_1",
                runtimeInstallationId: "rti_1",
              },
            }
          },
          async writeState(state) {
            writes.push(state)
          },
        },
        {
          runtimeInstallationId: "rti_1",
          setupToken: "mst_1",
        },
      ),
    ).resolves.toEqual([
      {
        accountId: "account_1",
        allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
        apiBaseUrl: "https://api.example.test",
        runtimeInstallationId: "rti_1",
        state: "online",
      },
    ])
    expect(writes).toEqual([
      {
        runtime: {
          accountId: "account_1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          directoryId: "dir_1",
          runtimeEncryptionKey: {
            keyBase64: "HIPEc-IQbmhNWb7His_JFsrE7QATVU23trLwcBB5J2Q",
            keyId: "client_setup_token:v1",
          },
          runtimeInstallationId: "rti_1",
        },
      },
    ])

    const launchWrites: RemoteRuntimeHostState[] = []
    await expect(
      installRemoteRuntimeSetupRuntimeLaunchAgent(
        {
          async installLaunchAgent() {
            throw new Error("disabled launch agent should not install")
          },
          async readState() {
            return {}
          },
          async writeState() {},
        },
        {
          accountId: "account_1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          enabled: false,
          runtimeInstallationId: "rti_1",
        },
      ),
    ).resolves.toBeUndefined()

    await expect(
      installRemoteRuntimeSetupRuntimeLaunchAgent(
        {
          async installLaunchAgent() {
            return {
              intervalSeconds: 30,
              label: "company.interbase.runtime",
              plistPath: "/tmp/interbase.plist",
              runtimeInstallationId: "rti_1",
            }
          },
          async readState() {
            return {}
          },
          async writeState(state) {
            launchWrites.push(state)
          },
        },
        {
          accountId: "account_1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          runtimeInstallationId: "rti_1",
          startIntervalSeconds: 30,
        },
      ),
    ).resolves.toEqual({
      intervalSeconds: 30,
      label: "company.interbase.runtime",
      plistPath: "/tmp/interbase.plist",
      runtimeInstallationId: "rti_1",
    })
    expect(launchWrites).toEqual([
      {
        launchd: {
          intervalSeconds: 30,
          label: "company.interbase.runtime",
          plistPath: "/tmp/interbase.plist",
          runtimeInstallationId: "rti_1",
        },
      },
    ])

    const removedRuntimeIds: string[] = []
    const stoppedInputs: Array<{ readonly runtimeInstallationId?: string }> = []
    const shutdowns: Array<{ readonly pid?: number; readonly url: string }> = []
    const stopWrites: RemoteRuntimeHostState[] = []
    const stopSelector = { runtimeInstallationId: "rti_1" }
    await (async (input: { readonly runtimeInstallationId?: string }) => {
      if (input.runtimeInstallationId) removedRuntimeIds.push(input.runtimeInstallationId)
    })(stopSelector)
    await expect(
      stopRemoteRuntimeOnHost(
        {
          async ensureHost() {
            throw new Error("stop cleanup should not ensure host")
          },
          hostClient() {
            return {
              start: async () => {
                throw new Error("stop cleanup should not start runtimes")
              },
              status: async () => [],
              stop: async (input: { readonly runtimeInstallationId?: string }) => {
                stoppedInputs.push(input)
                return [
                  {
                    accountId: "account_1",
                    allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
                    apiBaseUrl: "https://api.example.test",
                    runtimeInstallationId: "rti_1",
                    state: "stopped",
                  },
                ]
              },
            }
          },
          async installLaunchAgent() {
            throw new Error("stop cleanup should not install launch agents")
          },
          async readHost() {
            return { pid: 42, url: "http://127.0.0.1:4096" }
          },
          async readState() {
            return {
              host: { pid: 42, url: "http://127.0.0.1:4096" },
              runtime: {
                accountId: "account_1",
                apiBaseUrl: "https://api.example.test",
                directory: "/repo",
                directoryId: "dir_1",
                gatewayRuntimeAttachmentId: "gra_1",
                runtimeInstallationId: "rti_1",
                startedAt: "2026-05-17T00:00:00.000Z",
                state: "online",
              },
            }
          },
          async shutdownHost(host) {
            shutdowns.push(host)
          },
          async writeState(state) {
            stopWrites.push(state)
          },
        },
        stopSelector,
      ),
    ).resolves.toEqual([
      {
        accountId: "account_1",
        allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
        apiBaseUrl: "https://api.example.test",
        runtimeInstallationId: "rti_1",
        state: "stopped",
      },
    ])
    expect(removedRuntimeIds).toEqual(["rti_1"])
    expect(stoppedInputs).toEqual([{ runtimeInstallationId: "rti_1" }])
    expect(shutdowns).toEqual([{ pid: 42, url: "http://127.0.0.1:4096" }])
    expect(stopWrites).toEqual([
      {
        host: undefined,
        runtime: {
          accountId: "account_1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          directoryId: "dir_1",
          gatewayRuntimeAttachmentId: undefined,
          runtimeInstallationId: "rti_1",
          startedAt: undefined,
          state: "stopped",
        },
      },
    ])
  })
})
