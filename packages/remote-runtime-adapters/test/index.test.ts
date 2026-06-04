import { describe, expect, test } from "bun:test"
import { serializeRemoteRuntimeAsymmetricPublicKey } from "@interbase/remote-runtime-contracts"
import {
  createLocalDirectRemoteRuntimeAdapter,
  createRemoteRuntimeAdapterRegistry,
  buildCloudflareTunnelRuntimeConnectionCandidateBootstrap,
  buildDirectLocalRuntimeConnectionCandidateBootstrap,
  buildRemoteRuntimeConnectionCandidateBootstrap,
  buildRemoteRuntimeConnectionCandidateBootstraps,
  buildRemoteRuntimeConnectorRequestHeaders,
  buildRemoteRuntimeSetupPairingURL,
  buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps,
  buildZrokRuntimeConnectionCandidateBootstrap,
  completeRemoteRuntimeSetupAttachment,
  completeRemoteRuntimeConnectionCandidates,
  configuredRemoteRuntimeTunnelProviders,
  createCloudflareRuntimeTunnelProvider,
  createZrokRuntimeTunnelProvider,
  defaultRemoteRuntimeConnectionCandidateWebSocketUrl,
  deduplicateRemoteRuntimeTrustedDeviceAuthorities,
  mobilePairingAcceptedAuditEventAction,
  directLocalRemoteRuntimeConnectionCandidateBaseHttpUrl,
  discoverRuntimeConnectionCandidateBootstraps,
  remoteRuntimeConnectionCandidateBaseHttpUrl,
  remoteRuntimeDeviceRevokedAuditEventAction,
  remoteRuntimePairingAcceptedAuditEventAction,
  remoteRuntimeSetupPairingUrl,
  remoteRuntimeSetupLocalGatewayAuthority,
  mergeRemoteRuntimeLocalGatewayTrustedDeviceAuthorities,
  monitorAndCompleteRemoteRuntimeSetupAttachment,
  monitorRemoteRuntimeSetupAttachment,
  remoteRuntimeTrustedDeviceAuthoritiesFromLocalGatewayAuthority,
  remoteRuntimeTrustedDeviceAuthoritiesFromSetupAuditEvents,
  remoteRuntimeTrustedDeviceAuthoritiesFromTrustedDeviceRecords,
  remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey,
  normalizeRemoteRuntimeConnectionCandidateBaseUrl,
  orderRemoteRuntimeConnectionCandidates,
  parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential,
  parseRemoteRuntimeTrustedDeviceAuthority,
  publishRuntimeConnectionCandidatesForTrustedDevices,
  runtimeConnectionCandidateBootstrapsFromAuthority,
  trustedRuntimeClientPublicKeyFromSetupEvents,
} from "../src/index.js"

const versions = { remoteRuntimeHttp: "1", remoteRuntimeTransport: "1", runtimeWebSocket: "1" } as const

describe("remote runtime adapters", () => {
  test("registers adapters by explicit identity", () => {
    const adapter = createLocalDirectRemoteRuntimeAdapter({
      baseHttpUrl: "http://127.0.0.1:3000",
      acceptedContractVersions: versions,
      runtimeInstallationId: "runtime-1",
    })
    const registry = createRemoteRuntimeAdapterRegistry([adapter])
    expect(registry.get("local-direct")).toBe(adapter)
    expect(registry.list()).toEqual([adapter])
  })

  test("rejects duplicate adapter identities", () => {
    const adapter = createLocalDirectRemoteRuntimeAdapter({
      baseHttpUrl: "http://127.0.0.1:3000",
      acceptedContractVersions: versions,
      runtimeInstallationId: "runtime-1",
    })
    expect(() => createRemoteRuntimeAdapterRegistry([adapter, adapter])).toThrow(
      "Remote runtime adapter already registered: local-direct",
    )
  })

  test("local-direct adapter reports neutral capabilities and candidates", async () => {
    const adapter = createLocalDirectRemoteRuntimeAdapter({
      baseHttpUrl: "http://127.0.0.1:3000",
      webSocketUrl: "ws://127.0.0.1:3000/mobile",
      acceptedContractVersions: versions,
      runtimeInstallationId: "runtime-1",
    })
    expect(adapter.mode).toBe("localDirect")
    expect(adapter.capabilities()).toEqual({
      supportsProviderAuthority: false,
      supportsLocalDirect: true,
      supportsRemoteCandidates: false,
      supportsQrBootstrap: true,
    })
    await expect(
      adapter.beginPairing({ environment: "oss" }, { mode: "qr", requestedCapabilities: [] }),
    ).resolves.toEqual({
      runtimeInstallationId: "runtime-1",
      candidates: [
        {
          ref: { candidateId: "local-direct", kind: "local", priority: 0 },
          baseHttpUrl: "http://127.0.0.1:3000",
          webSocketUrl: "ws://127.0.0.1:3000/mobile",
          metadata: { hostReachability: "loopback", environment: "desktop" },
        },
      ],
      acceptedContractVersions: versions,
    })
    await expect(adapter.refreshCandidates({ environment: "oss" })).resolves.toHaveLength(1)
    await expect(
      adapter.resolveAttachmentBootstrap(
        { environment: "oss" },
        { candidateId: "local-direct", kind: "local", priority: 0 },
      ),
    ).resolves.toEqual({
      candidate: {
        ref: { candidateId: "local-direct", kind: "local", priority: 0 },
        baseHttpUrl: "http://127.0.0.1:3000",
        webSocketUrl: "ws://127.0.0.1:3000/mobile",
        metadata: { hostReachability: "loopback", environment: "desktop" },
      },
    })
  })

  test("builds remote runtime setup pairing URLs with scoped bootstrap data", () => {
    expect(
      buildRemoteRuntimeSetupPairingURL({
        apiBaseUrl: "https://api.interbase.test/base",
        runtimeInstallationId: "runtime-1",
        setupToken: "setup-token-1",
      }),
    ).toBe("interbase://remote-runtime/pairing?a=https%3A%2F%2Fapi.interbase.test&t=setup-token-1&r=runtime-1")
    expect(remoteRuntimeSetupPairingUrl).toBe("interbase://remote-runtime/pairing")

    const bootstrap = buildDirectLocalRuntimeConnectionCandidateBootstrap({
      expiresAt: "2026-05-14T00:00:00.000Z",
      host: { url: "http://127.0.0.1:4096/local" },
      runtime: {
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey: {
          algorithm: "ed25519",
          createdAt: "2026-05-14T00:00:00.000Z",
          encoding: "base64url",
          keyId: "runtime-signing-key",
          publicKey: "RuntimePublicKey0123_-",
          purpose: "runtimeResponseSigning",
        },
      },
    })
    const url = new URL(
      buildRemoteRuntimeSetupPairingURL({
        apiBaseUrl: "https://api.interbase.test/base",
        runtimeConnectionCandidateBootstraps: [bootstrap],
        runtimeInstallationId: "runtime-1",
        setupToken: "setup-token-1",
        trustedRuntimeClientId: " device-1 ",
      }),
    )
    expect(url.searchParams.get("d")).toBe(" device-1 ")
    expect(
      JSON.parse(
        Buffer.from(url.searchParams.get("c")!.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8"),
      ),
    ).toEqual([bootstrap])
  })

  test("builds connector request headers with optional bearer authorization", () => {
    expect(
      buildRemoteRuntimeConnectorRequestHeaders(
        {
          authorizationToken: " token-1 ",
        },
        {
          "content-type": "application/json",
        },
      ),
    ).toEqual({
      authorization: "Bearer token-1",
      "content-type": "application/json",
    })
    expect(
      buildRemoteRuntimeConnectorRequestHeaders({ authorizationToken: " " }, { accept: "application/json" }),
    ).toEqual({
      accept: "application/json",
    })
    expect(buildRemoteRuntimeConnectorRequestHeaders({ authorizationToken: null })).toEqual({})
  })

  test("builds setup runtime connection bootstraps from host state or reusable authority", async () => {
    const runtimePublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-17T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const

    await expect(
      buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps({
        now: () => Date.parse("2026-05-17T00:00:00.000Z"),
        runtimeHostState: {},
        runtimeInstallationId: "rti_1",
        runtimeResponseSigningPublicKey: runtimePublicKey,
      }),
    ).resolves.toEqual([])

    await expect(
      buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps({
        localRuntimeCredential: {
          localRuntimeAccessToken: "lrt_secret_1",
          localRuntimeAccessTokenId: "lrt_1",
        },
        now: () => Date.parse("2026-05-17T00:00:00.000Z"),
        runtimeHostState: {},
        runtimeInstallationId: "rti_1",
      }),
    ).resolves.toEqual([])

    const directBootstraps = await buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps({
      localRuntimeCredential: {
        localRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrt_1",
      },
      now: () => Date.parse("2026-05-17T00:00:00.000Z"),
      runtimeHostState: {
        host: { password: "server-secret", url: "http://127.0.0.1:4096" },
      },
      runtimeInstallationId: "rti_1",
      runtimeResponseSigningPublicKey: runtimePublicKey,
    })
    expect(directBootstraps).toMatchObject([
      {
        baseHttpUrl: "http://127.0.0.1:4096/global?auth_token=aW50ZXJiYXNlOnNlcnZlci1zZWNyZXQ%3D",
        expiresAt: "2026-05-17T01:00:00.000Z",
        kind: "direct",
        localRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrt_1",
        runtimeInstallationId: "rti_1",
        runtimeResponseSigningPublicKey: runtimePublicKey,
        webSocketUrl: "ws://127.0.0.1:4096/global/remote-runtime/socket?auth_token=aW50ZXJiYXNlOnNlcnZlci1zZWNyZXQ%3D",
      },
    ])

    const reusableAuthorityBootstraps = await buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps({
      localRuntimeCredential: {
        localRuntimeAccessToken: "unused_new_secret",
        localRuntimeAccessTokenId: "unused_new_id",
      },
      now: () => Date.parse("2026-05-17T00:00:00.000Z"),
      runtimeHostState: {
        host: { url: "http://127.0.0.1:4096" },
        runtime: {
          accountId: "acct_1",
          apiBaseUrl: "https://api.interbase.test",
          directory: "/repo",
          directoryId: "dir_1",
          localGatewayAuthority: {
            expectedLocalRuntimeAccessToken: "lrt_reusable_secret",
            localRuntimeAccessTokenId: "lrt_reusable",
            runtimeResponseSigningPublicKey: runtimePublicKey,
          },
          runtimeInstallationId: "rti_1",
        },
      },
      runtimeInstallationId: "rti_1",
    })
    expect(reusableAuthorityBootstraps[0]).toMatchObject({
      localRuntimeAccessToken: "lrt_reusable_secret",
      localRuntimeAccessTokenId: "lrt_reusable",
    })
  })

  test("normalizes runtime connection candidate URLs without private authority", () => {
    expect(() => normalizeRemoteRuntimeConnectionCandidateBaseUrl("file:///tmp/runtime")).toThrow(
      "Runtime connection candidate base URL must use HTTP or HTTPS.",
    )
    expect(
      String(normalizeRemoteRuntimeConnectionCandidateBaseUrl("https://runtime.test/base/path?token=1#hash")),
    ).toBe("https://runtime.test/")
    const preserved = normalizeRemoteRuntimeConnectionCandidateBaseUrl("http://127.0.0.1:4096/base/path?token=1#hash", {
      preserveBasePath: true,
    })
    expect(String(preserved)).toBe("http://127.0.0.1:4096/base/path")
    expect(remoteRuntimeConnectionCandidateBaseHttpUrl(new URL("https://runtime.test/"))).toBe("https://runtime.test")
    expect(remoteRuntimeConnectionCandidateBaseHttpUrl(preserved)).toBe("http://127.0.0.1:4096/base/path")
    expect(defaultRemoteRuntimeConnectionCandidateWebSocketUrl(new URL("https://runtime.test/base/"))).toBe(
      "wss://runtime.test/base/remote-runtime/socket",
    )
    expect(defaultRemoteRuntimeConnectionCandidateWebSocketUrl(new URL("http://127.0.0.1:4096/"))).toBe(
      "ws://127.0.0.1:4096/remote-runtime/socket",
    )
    expect(directLocalRemoteRuntimeConnectionCandidateBaseHttpUrl("http://127.0.0.1:4096/local/base?token=1")).toBe(
      "http://127.0.0.1:4096/global",
    )
  })

  test("builds direct local runtime connection candidate bootstrap", () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const

    expect(
      buildDirectLocalRuntimeConnectionCandidateBootstrap({
        expiresAt: "2026-05-14T00:00:00.000Z",
        host: { url: "http://127.0.0.1:4096/local/base?token=1" },
        runtime: {
          localRuntimeAccessToken: "local-token",
          localRuntimeAccessTokenId: "local-token-id",
          runtimeInstallationId: "runtime-1",
          runtimeResponseSigningPublicKey,
        },
      }),
    ).toEqual({
      baseHttpUrl: "http://127.0.0.1:4096/global",
      candidateId: "direct:runtime-1:local-token-id",
      edgeAccess: null,
      environment: "simulator",
      expiresAt: "2026-05-14T00:00:00.000Z",
      hostReachability: "loopback",
      kind: "direct",
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      priority: 0,
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
      webSocketUrl: "ws://127.0.0.1:4096/global/remote-runtime/socket",
    })

    expect(
      buildDirectLocalRuntimeConnectionCandidateBootstrap({
        expiresAt: "2026-05-14T00:00:00.000Z",
        host: { password: "server-secret", url: "http://127.0.0.1:4096/local/base?token=1" },
        runtime: {
          localRuntimeAccessToken: "local-token",
          localRuntimeAccessTokenId: "local-token-id",
          runtimeInstallationId: "runtime-1",
          runtimeResponseSigningPublicKey,
        },
      }),
    ).toMatchObject({
      baseHttpUrl: "http://127.0.0.1:4096/global?auth_token=aW50ZXJiYXNlOnNlcnZlci1zZWNyZXQ%3D",
      webSocketUrl: "ws://127.0.0.1:4096/global/remote-runtime/socket?auth_token=aW50ZXJiYXNlOnNlcnZlci1zZWNyZXQ%3D",
    })

    expect(
      buildDirectLocalRuntimeConnectionCandidateBootstrap({
        expiresAt: "2026-05-14T00:00:00.000Z",
        host: { url: "https://runtime.test/custom" },
        hostReachability: "lan",
        priority: 3,
        runtime: {
          localRuntimeAccessToken: "local-token",
          localRuntimeAccessTokenId: "local-token-id",
          runtimeInstallationId: "runtime-1",
          runtimeResponseSigningPublicKey,
        },
      }),
    ).toMatchObject({
      baseHttpUrl: "https://runtime.test/global",
      hostReachability: "lan",
      priority: 3,
      webSocketUrl: "wss://runtime.test/global/remote-runtime/socket",
    })
  })

  test("builds provider-neutral runtime tunnel candidate bootstraps", () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const runtime = {
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
    }

    expect(
      buildCloudflareTunnelRuntimeConnectionCandidateBootstrap({
        edgeAccess: {
          clientId: "cf-client-id",
          clientIdHeaderName: "CF-Access-Client-Id",
          clientSecret: "cf-client-secret",
          clientSecretHeaderName: "CF-Access-Client-Secret",
          provider: "cloudflareAccess",
        },
        expiresAt: "2026-05-14T00:00:00.000Z",
        publicBaseHttpUrl: "https://runtime.test/base?token=1",
        publicWebSocketUrl: "wss://runtime.test/socket",
        runtime,
        tunnelId: "tunnel-1",
      }),
    ).toEqual({
      baseHttpUrl: "https://runtime.test",
      candidateId: "cloudflare:runtime-1:tunnel-1:local-token-id",
      edgeAccess: {
        clientId: "cf-client-id",
        clientIdHeaderName: "CF-Access-Client-Id",
        clientSecret: "cf-client-secret",
        clientSecretHeaderName: "CF-Access-Client-Secret",
        provider: "cloudflareAccess",
      },
      environment: "tunnel",
      expiresAt: "2026-05-14T00:00:00.000Z",
      hostReachability: "public",
      kind: "cloudflareTunnel",
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      priority: 10,
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
      webSocketUrl: "wss://runtime.test/socket",
    })

    expect(
      buildZrokRuntimeConnectionCandidateBootstrap({
        expiresAt: "2026-05-14T00:00:00.000Z",
        priority: 8,
        publicBaseHttpUrl: "https://zrok.example/base?token=1",
        runtime,
        shareId: "share-1",
      }),
    ).toMatchObject({
      baseHttpUrl: "https://zrok.example",
      candidateId: "zrok:runtime-1:share-1:local-token-id",
      edgeAccess: null,
      kind: "zrokPublicHttp",
      priority: 8,
      webSocketUrl: "wss://zrok.example/remote-runtime/socket",
    })
  })

  test("discovers runtime connection candidate bootstraps from direct and tunnel providers", async () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const runtime = {
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
    }

    await expect(
      discoverRuntimeConnectionCandidateBootstraps({
        direct: {
          expiresAt: "2026-05-14T00:00:00.000Z",
          host: { url: "http://127.0.0.1:4096/local" },
          runtime,
        },
        expiresAt: "2026-05-14T00:00:00.000Z",
        runtime,
        tunnelProviders: [
          {
            async discoverCandidates(input) {
              return {
                provider: "cloudflareTunnel",
                candidates: [
                  {
                    baseHttpUrl: "https://runtime.test/base?token=1",
                    candidateId: `cloudflare:${input.runtime.runtimeInstallationId}:tunnel-1:${input.runtime.localRuntimeAccessTokenId}`,
                    edgeAccess: null,
                    environment: "tunnel",
                    expiresAt: input.expiresAt,
                    hostReachability: "public",
                    kind: "cloudflareTunnel",
                    localRuntimeAccessToken: input.runtime.localRuntimeAccessToken,
                    localRuntimeAccessTokenId: input.runtime.localRuntimeAccessTokenId,
                    priority: 10,
                    runtimeInstallationId: input.runtime.runtimeInstallationId,
                    runtimeResponseSigningPublicKey: input.runtime.runtimeResponseSigningPublicKey,
                  },
                ],
              }
            },
          },
        ],
      }),
    ).resolves.toEqual([
      {
        baseHttpUrl: "http://127.0.0.1:4096/global",
        candidateId: "direct:runtime-1:local-token-id",
        edgeAccess: null,
        environment: "simulator",
        expiresAt: "2026-05-14T00:00:00.000Z",
        hostReachability: "loopback",
        kind: "direct",
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        priority: 0,
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
        webSocketUrl: "ws://127.0.0.1:4096/global/remote-runtime/socket",
      },
      {
        baseHttpUrl: "https://runtime.test",
        candidateId: "cloudflare:runtime-1:tunnel-1:local-token-id",
        edgeAccess: null,
        environment: "tunnel",
        expiresAt: "2026-05-14T00:00:00.000Z",
        hostReachability: "public",
        kind: "cloudflareTunnel",
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        priority: 10,
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
        webSocketUrl: "wss://runtime.test/remote-runtime/socket",
      },
    ])

    await expect(
      discoverRuntimeConnectionCandidateBootstraps({
        expiresAt: "2026-05-14T00:00:00.000Z",
        runtime,
      }),
    ).resolves.toEqual([])
  })

  test("discovers tunnel candidates from public Cloudflare and Zrok providers", async () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const runtime = {
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
    }

    await expect(
      discoverRuntimeConnectionCandidateBootstraps({
        expiresAt: "2026-05-14T00:00:00.000Z",
        runtime,
        tunnelProviders: [
          createZrokRuntimeTunnelProvider({
            publicBaseHttpUrl: "https://zrok.example/base",
            publicWebSocketUrl: "wss://zrok.example/socket",
            shareId: "share-1",
          }),
          createCloudflareRuntimeTunnelProvider({
            priority: 5,
            publicBaseHttpUrl: "https://cloudflare.example/base",
            tunnelId: "tunnel-1",
          }),
        ],
      }),
    ).resolves.toMatchObject([
      {
        candidateId: "cloudflare:runtime-1:tunnel-1:local-token-id",
        edgeAccess: null,
        kind: "cloudflareTunnel",
        priority: 5,
        webSocketUrl: "wss://cloudflare.example/remote-runtime/socket",
      },
      {
        candidateId: "zrok:runtime-1:share-1:local-token-id",
        kind: "zrokPublicHttp",
        priority: 20,
        webSocketUrl: "wss://zrok.example/socket",
      },
    ])
  })

  test("configures runtime tunnel providers from explicit environment authority", async () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const runtime = {
      localRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey,
    }

    expect(configuredRemoteRuntimeTunnelProviders({})).toEqual([])

    const providers = configuredRemoteRuntimeTunnelProviders({
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID: " cf-client-id ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID_HEADER: " X-CF-Client ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET: " cf-client-secret ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET_HEADER: " X-CF-Secret ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL: " https://cloudflare.example/base ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID: " tunnel-1 ",
      INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_WEBSOCKET_URL: " wss://cloudflare.example/socket ",
      INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL: " https://zrok.example/base ",
      INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID: " share-1 ",
    })

    await expect(
      discoverRuntimeConnectionCandidateBootstraps({
        expiresAt: "2026-05-14T00:00:00.000Z",
        runtime,
        tunnelProviders: providers,
      }),
    ).resolves.toMatchObject([
      {
        baseHttpUrl: "https://cloudflare.example",
        candidateId: "cloudflare:runtime-1:tunnel-1:local-token-id",
        edgeAccess: {
          clientId: "cf-client-id",
          clientIdHeaderName: "X-CF-Client",
          clientSecret: "cf-client-secret",
          clientSecretHeaderName: "X-CF-Secret",
          provider: "cloudflareAccess",
        },
        webSocketUrl: "wss://cloudflare.example/socket",
      },
      {
        baseHttpUrl: "https://zrok.example",
        candidateId: "zrok:runtime-1:share-1:local-token-id",
      },
    ])

    await expect(
      discoverRuntimeConnectionCandidateBootstraps({
        expiresAt: "2026-05-14T00:00:00.000Z",
        runtime,
        tunnelProviders: configuredRemoteRuntimeTunnelProviders({
          INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL: "https://cloudflare.example",
          INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID: "tunnel-2",
        }),
      }),
    ).resolves.toMatchObject([{ edgeAccess: null }])
  })

  test("rejects partial runtime tunnel provider environment authority", () => {
    expect(() =>
      configuredRemoteRuntimeTunnelProviders({
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID: "tunnel-1",
      }),
    ).toThrow("INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL is required")
    expect(() =>
      configuredRemoteRuntimeTunnelProviders({
        INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL: "https://zrok.example",
      }),
    ).toThrow("INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID is required")
    expect(() =>
      configuredRemoteRuntimeTunnelProviders({
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID: "cf-client-id",
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL: "https://cloudflare.example",
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID: "tunnel-1",
      }),
    ).toThrow("INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET is required")
    expect(() =>
      configuredRemoteRuntimeTunnelProviders({
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET: "cf-client-secret",
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL: "https://cloudflare.example",
        INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID: "tunnel-1",
      }),
    ).toThrow("INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID is required")
  })

  test("derives runtime connection candidate bootstraps from local gateway authority", async () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-signing-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const authority = {
      expectedLocalRuntimeAccessToken: "local-token",
      localRuntimeAccessTokenId: "local-token-id",
      runtimeResponseSigningPublicKey,
      trustedRuntimeClientId: "device-1",
      trustedRuntimeClientPublicKey: "device-public-key",
    }

    await expect(
      runtimeConnectionCandidateBootstrapsFromAuthority({
        host: { url: "http://127.0.0.1:4096/local" },
        now: () => Date.parse("2026-05-14T00:00:00.000Z"),
        runtimeInstallationId: "runtime-1",
        runtimeLocalGatewayAuthority: authority,
        tunnelProviders: [
          {
            async discoverCandidates(input) {
              return {
                provider: "zrokPublicHttp",
                candidates: [
                  {
                    baseHttpUrl: "https://zrok.example/base",
                    candidateId: `zrok:${input.runtime.runtimeInstallationId}:share-1:${input.runtime.localRuntimeAccessTokenId}`,
                    expiresAt: input.expiresAt,
                    kind: "zrokPublicHttp",
                    localRuntimeAccessToken: input.runtime.localRuntimeAccessToken,
                    localRuntimeAccessTokenId: input.runtime.localRuntimeAccessTokenId,
                    priority: 20,
                    runtimeInstallationId: input.runtime.runtimeInstallationId,
                    runtimeResponseSigningPublicKey: input.runtime.runtimeResponseSigningPublicKey,
                  },
                ],
              }
            },
          },
        ],
      }),
    ).resolves.toMatchObject([
      {
        candidateId: "direct:runtime-1:local-token-id",
        expiresAt: "2026-05-14T01:00:00.000Z",
        kind: "direct",
        priority: 0,
      },
      {
        baseHttpUrl: "https://zrok.example",
        candidateId: "zrok:runtime-1:share-1:local-token-id",
        expiresAt: "2026-05-14T01:00:00.000Z",
        kind: "zrokPublicHttp",
        priority: 20,
      },
    ])

    await expect(
      runtimeConnectionCandidateBootstrapsFromAuthority({
        runtimeInstallationId: "runtime-1",
      }),
    ).resolves.toEqual([])
    await expect(
      runtimeConnectionCandidateBootstrapsFromAuthority({
        runtimeInstallationId: "runtime-1",
        runtimeLocalGatewayAuthority: { ...authority, runtimeResponseSigningPublicKey: undefined },
      }),
    ).resolves.toEqual([])
  })

  test("publishes completed runtime candidates for trusted devices", async () => {
    const mobilePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mobile-key-1",
      publicKey: "MobilePublicKey0123_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const runtimePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-key-1",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    })
    const bootstrap = buildDirectLocalRuntimeConnectionCandidateBootstrap({
      expiresAt: "2026-05-14T00:00:00.000Z",
      host: { url: "http://127.0.0.1:4096/local" },
      runtime: {
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey: {
          algorithm: "ed25519",
          createdAt: "2026-05-14T00:00:00.000Z",
          encoding: "base64url",
          keyId: "runtime-signing-key",
          publicKey: "RuntimePublicKey0123_-",
          purpose: "runtimeResponseSigning",
        },
      },
    })
    const replacements: Array<{
      readonly remoteRuntimeRequestSigningKeyId: string
      readonly trustedRuntimeClientId: string
    }> = []

    expect(remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey(mobilePublicKey)).toBe("mobile-key-1")
    expect(remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey(runtimePublicKey)).toBeUndefined()
    expect(remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey("not-json")).toBeUndefined()

    await publishRuntimeConnectionCandidatesForTrustedDevices({
      client: {
        async listSetupAuditEvents() {
          return [
            {
              action: remoteRuntimePairingAcceptedAuditEventAction,
              details: { publicKey: mobilePublicKey },
              runtimeInstallationId: "runtime-1",
              trustedRuntimeClientId: "device-from-audit",
            },
          ]
        },
        async replaceRuntimeConnectionCandidates(input) {
          replacements.push({
            remoteRuntimeRequestSigningKeyId: input.candidates[0]?.remoteRuntimeRequestSigningKeyId ?? "missing",
            trustedRuntimeClientId: input.trustedRuntimeClientId,
          })
        },
      },
      runtimeConnectionCandidateBootstraps: [bootstrap],
      runtimeInstallationId: "runtime-1",
      runtimeLocalGatewayAuthority: {
        trustedRuntimeClientAuthorities: [
          { publicKey: runtimePublicKey, trustedRuntimeClientId: "ignored-runtime-key" },
        ],
        trustedRuntimeClientId: "primary",
        trustedRuntimeClientPublicKey: mobilePublicKey,
      },
    })

    expect(replacements).toEqual([
      { remoteRuntimeRequestSigningKeyId: "mobile-key-1", trustedRuntimeClientId: "primary" },
      { remoteRuntimeRequestSigningKeyId: "mobile-key-1", trustedRuntimeClientId: "device-from-audit" },
    ])

    await publishRuntimeConnectionCandidatesForTrustedDevices({
      client: {
        async listSetupAuditEvents() {
          throw new Error("should not load audit events")
        },
        async replaceRuntimeConnectionCandidates() {
          throw new Error("should not publish empty candidates")
        },
      },
      runtimeConnectionCandidateBootstraps: [],
      runtimeInstallationId: "runtime-1",
      trustedRuntimeClientAuthorities: [{ publicKey: mobilePublicKey, trustedRuntimeClientId: "device-1" }],
    })
  })

  test("completes mobile setup attachments with restart and candidate publication", async () => {
    const mobilePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mobile-key-1",
      publicKey: "MobilePublicKey0123_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-key-1",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    const bootstrap = buildDirectLocalRuntimeConnectionCandidateBootstrap({
      expiresAt: "2026-05-14T00:00:00.000Z",
      host: { url: "http://127.0.0.1:4096/local" },
      runtime: {
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
      },
    })
    const restarts: Array<{
      readonly allowedDirectoryIds: readonly string[]
      readonly tokenId: string
      readonly trustedRuntimeClientId: string
    }> = []
    const replacements: Array<{
      readonly remoteRuntimeRequestSigningKeyId: string
      readonly trustedRuntimeClientId: string
    }> = []
    const events = [
      {
        action: "remoteRuntime.pairing.accepted",
        createdAt: "2026-05-14T00:00:00.000Z",
        details: { publicKey: mobilePublicKey },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-1",
      },
    ]

    expect(
      trustedRuntimeClientPublicKeyFromSetupEvents(events, {
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-1",
      }),
    ).toBe(mobilePublicKey)
    await expect(
      completeRemoteRuntimeSetupAttachment({
        authorizationToken: "api-token",
        client: {
          async replaceRuntimeConnectionCandidates(input) {
            replacements.push({
              remoteRuntimeRequestSigningKeyId: input.candidates[0]?.remoteRuntimeRequestSigningKeyId ?? "missing",
              trustedRuntimeClientId: input.trustedRuntimeClientId,
            })
          },
        },
        event: {
          details: { clientAttachmentId: "attachment-1" },
          trustedRuntimeClientId: "device-1",
        },
        events,
        localRuntimeCredential: {
          localRuntimeAccessToken: "local-token",
          localRuntimeAccessTokenId: "local-token-id",
        },
        async restartRuntime(input) {
          restarts.push({
            allowedDirectoryIds: input.allowedDirectories.map((directory) => directory.directoryId),
            tokenId: input.localGatewayAuthority.localRuntimeAccessTokenId,
            trustedRuntimeClientId: input.localGatewayAuthority.trustedRuntimeClientId,
          })
        },
        runtimeConnectionCandidateBootstraps: [bootstrap],
        runtimeHostState: {
          host: { url: "http://127.0.0.1:4096" },
          runtime: {
            accountId: "account-1",
            allowedDirectories: [
              { directoryId: "directory-1", path: "/repo" },
              { directoryId: "directory-2", path: "/other-repo" },
            ],
            apiBaseUrl: "https://api.example.test",
            directory: "/repo",
            directoryId: "directory-1",
            runtimeInstallationId: "runtime-1",
          },
        },
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
      }),
    ).resolves.toEqual({ clientAttachmentId: "attachment-1", trustedRuntimeClientId: "device-1" })

    expect(restarts).toEqual([
      {
        allowedDirectoryIds: ["directory-1", "directory-2"],
        tokenId: "local-token-id",
        trustedRuntimeClientId: "device-1",
      },
    ])
    expect(replacements).toEqual([
      { remoteRuntimeRequestSigningKeyId: "mobile-key-1", trustedRuntimeClientId: "device-1" },
    ])

    await expect(
      completeRemoteRuntimeSetupAttachment({
        authorizationToken: "api-token",
        client: {
          async replaceRuntimeConnectionCandidates() {
            throw new Error("missing directory authority should not publish")
          },
        },
        event: {
          details: { clientAttachmentId: "attachment-missing-authority" },
          trustedRuntimeClientId: "device-1",
        },
        events,
        localRuntimeCredential: {
          localRuntimeAccessToken: "local-token",
          localRuntimeAccessTokenId: "local-token-id",
        },
        async restartRuntime() {
          throw new Error("missing directory authority should not restart")
        },
        runtimeConnectionCandidateBootstraps: [bootstrap],
        runtimeHostState: {
          host: { url: "http://127.0.0.1:4096" },
          runtime: {
            accountId: "account-1",
            apiBaseUrl: "https://api.example.test",
            directory: "/repo",
            directoryId: "directory-1",
            runtimeInstallationId: "runtime-1",
          },
        },
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
      }),
    ).rejects.toThrow("persisted allowed directory authority")

    await expect(
      completeRemoteRuntimeSetupAttachment({
        authorizationToken: "api-token",
        client: {
          async replaceRuntimeConnectionCandidates() {
            throw new Error("missing public key should not publish")
          },
        },
        event: { details: { clientAttachmentId: "attachment-2" }, trustedRuntimeClientId: "missing-device" },
        events,
        async restartRuntime() {
          throw new Error("missing public key should not restart")
        },
        runtimeConnectionCandidateBootstraps: [bootstrap],
        runtimeHostState: {},
        runtimeInstallationId: "runtime-1",
      }),
    ).resolves.toEqual({ clientAttachmentId: "attachment-2", trustedRuntimeClientId: "missing-device" })
  })

  test("monitors setup attachment sleeps and exits cleanly on abort", async () => {
    const controller = new AbortController()
    const sleeps: number[] = []
    let polls = 0
    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_1",
      listAuditEvents: async () => {
        polls += 1
        return []
      },
      onAttached: () => {
        throw new Error("should not attach")
      },
      pollIntervalMs: 5,
      runtimeInstallationId: "rti_1",
      signal: controller.signal,
      sleep: async (milliseconds, signal) => {
        sleeps.push(milliseconds)
        expect(signal).toBe(controller.signal)
        controller.abort()
      },
      trustedRuntimeClientId: "tmd_1",
    })

    expect(polls).toBe(1)
    expect(sleeps).toEqual([5])
  })

  test("monitors and completes setup attachment with runtime restart and candidate publication", async () => {
    const mobilePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mobile-key-2",
      publicKey: "MobilePublicKey4567_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-key-2",
      publicKey: "RuntimePublicKey4567_-",
      purpose: "runtimeResponseSigning",
    } as const
    const bootstrap = buildDirectLocalRuntimeConnectionCandidateBootstrap({
      expiresAt: "2026-05-14T00:00:00.000Z",
      host: { url: "http://127.0.0.1:4096/local" },
      runtime: {
        localRuntimeAccessToken: "local-token",
        localRuntimeAccessTokenId: "local-token-id",
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey,
      },
    })
    const attachedEvents = [
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-05-14T00:00:00.000Z",
        details: { publicKey: mobilePublicKey },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-2",
      },
      {
        action: "remoteRuntime.client.attached",
        createdAt: "2026-05-14T00:00:01.000Z",
        details: {
          gatewayRuntimeAttachmentId: "gra_2",
          clientAttachmentId: "attachment-3",
        },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-2",
      },
    ] as const
    const replacements: Array<{ readonly candidateCount: number; readonly trustedRuntimeClientId: string }> = []
    const restarts: string[] = []

    await expect(
      monitorAndCompleteRemoteRuntimeSetupAttachment(
        {
          authorizationToken: "api-token",
          client: {
            async listAuditEvents() {
              return attachedEvents
            },
            async replaceRuntimeConnectionCandidates(input) {
              replacements.push({
                candidateCount: input.candidates.length,
                trustedRuntimeClientId: input.trustedRuntimeClientId,
              })
            },
          },
          gatewayRuntimeAttachmentId: "gra_2",
          localRuntimeCredential: {
            localRuntimeAccessToken: "local-token",
            localRuntimeAccessTokenId: "local-token-id",
          },
          pollIntervalMs: 0,
          runtimeConnectionCandidateBootstraps: [bootstrap],
          runtimeInstallationId: "runtime-1",
          runtimeResponseSigningPublicKey,
          trustedRuntimeClientId: null,
        },
        {
          async readRuntimeHostState() {
            return {
              host: { url: "http://127.0.0.1:4096" },
              runtime: {
                accountId: "account-1",
                allowedDirectories: [{ directoryId: "directory-1", path: "/repo" }],
                apiBaseUrl: "https://api.example.test",
                directory: "/repo",
                directoryId: "directory-1",
                runtimeInstallationId: "runtime-1",
              },
            }
          },
          async restartRuntime(input) {
            restarts.push(input.localGatewayAuthority.trustedRuntimeClientId)
          },
        },
      ),
    ).resolves.toEqual({ clientAttachmentId: "attachment-3", trustedRuntimeClientId: "device-2" })

    expect(restarts).toEqual(["device-2"])
    expect(replacements).toEqual([{ candidateCount: 1, trustedRuntimeClientId: "device-2" }])
  })

  test("monitor ignores unattached events when no authoritative trusted device is available", async () => {
    const controller = new AbortController()
    let polls = 0

    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_missing_device",
      listAuditEvents: async () => {
        polls += 1
        return [
          {
            action: "remoteRuntime.client.attached",
            createdAt: "2026-05-15T00:00:00.000Z",
            details: { gatewayRuntimeAttachmentId: "gra_missing_device" },
            runtimeInstallationId: "rti_1",
            trustedRuntimeClientId: "tmd_unknown",
          },
        ]
      },
      onAttached: () => {
        throw new Error("should not attach without an authoritative trusted device")
      },
      pollIntervalMs: 0,
      runtimeInstallationId: "rti_1",
      signal: controller.signal,
      sleep: async () => {
        controller.abort()
      },
      trustedRuntimeClientId: null,
    })

    expect(polls).toBe(1)
  })

  test("default monitor sleep resolves once a later poll attaches", async () => {
    let polls = 0
    const attached: string[] = []

    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_delayed",
      listAuditEvents: async () => {
        polls += 1
        return polls === 1
          ? []
          : [
              {
                action: "remoteRuntime.client.attached",
                createdAt: "2026-05-16T00:00:00.000Z",
                details: { gatewayRuntimeAttachmentId: "gra_delayed" },
                runtimeInstallationId: "rti_1",
                trustedRuntimeClientId: "tmd_1",
              },
            ]
      },
      onAttached: (event) => {
        attached.push(event.trustedRuntimeClientId ?? "missing")
      },
      pollIntervalMs: 1,
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: "tmd_1",
    })

    expect(polls).toBe(2)
    expect(attached).toEqual(["tmd_1"])
  })

  test("default monitor sleep handles aborted and malformed abort signals", async () => {
    let preSleepAbortReads = 0
    const preSleepAbortedSignal = {
      get aborted() {
        preSleepAbortReads += 1
        return preSleepAbortReads > 1
      },
      addEventListener() {},
      reason: new Error("aborted before timeout scheduling"),
      removeEventListener() {},
    } as unknown as AbortSignal
    await expect(
      monitorRemoteRuntimeSetupAttachment({
        gatewayRuntimeAttachmentId: "gra_pre_sleep_aborted",
        listAuditEvents: async () => [],
        onAttached: () => {
          throw new Error("should not attach")
        },
        pollIntervalMs: 0,
        runtimeInstallationId: "rti_1",
        signal: preSleepAbortedSignal,
        trustedRuntimeClientId: "tmd_1",
      }),
    ).resolves.toBeUndefined()

    const preAbortedController = new AbortController()
    preAbortedController.abort(new Error("pre-aborted"))
    await expect(
      monitorRemoteRuntimeSetupAttachment({
        gatewayRuntimeAttachmentId: "gra_pre_aborted",
        listAuditEvents: async () => [],
        onAttached: () => {
          throw new Error("should not attach")
        },
        pollIntervalMs: 0,
        runtimeInstallationId: "rti_1",
        signal: preAbortedController.signal,
        trustedRuntimeClientId: "tmd_1",
      }),
    ).resolves.toBeUndefined()

    const abortDuringSleepController = new AbortController()
    setTimeout(() => abortDuringSleepController.abort(new Error("aborted during sleep")), 0)
    await expect(
      monitorRemoteRuntimeSetupAttachment({
        gatewayRuntimeAttachmentId: "gra_abort_during_sleep",
        listAuditEvents: async () => [],
        onAttached: () => {
          throw new Error("should not attach")
        },
        pollIntervalMs: 10,
        runtimeInstallationId: "rti_1",
        signal: abortDuringSleepController.signal,
        trustedRuntimeClientId: "tmd_1",
      }),
    ).resolves.toBeUndefined()

    const malformedSignal = {
      aborted: false,
      addEventListener(_type: string, listener: () => void) {
        listener()
      },
      reason: new Error("listener-triggered rejection"),
      removeEventListener() {},
    } as unknown as AbortSignal
    await expect(
      monitorRemoteRuntimeSetupAttachment({
        gatewayRuntimeAttachmentId: "gra_malformed_signal",
        listAuditEvents: async () => [],
        onAttached: () => {
          throw new Error("should not attach")
        },
        pollIntervalMs: 0,
        runtimeInstallationId: "rti_1",
        signal: malformedSignal,
        trustedRuntimeClientId: "tmd_1",
      }),
    ).rejects.toThrow("listener-triggered rejection")
  })

  test("monitors setup attachment using derived trusted device identity and reused attachment fallback", async () => {
    const derivedTrustedDeviceAttached: Record<string, unknown>[] = []
    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_1",
      listAuditEvents: async () => [
        {
          action: remoteRuntimePairingAcceptedAuditEventAction,
          createdAt: "2026-05-15T00:00:00.000Z",
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_old",
        },
        {
          action: remoteRuntimePairingAcceptedAuditEventAction,
          createdAt: "2026-05-16T00:00:00.000Z",
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_derived",
        },
        {
          action: "remoteRuntime.client.attached",
          createdAt: "2026-05-16T00:00:01.000Z",
          details: { gatewayRuntimeAttachmentId: "gra_1" },
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_derived",
        },
      ],
      minCreatedAt: "2026-05-15T00:00:00.000Z",
      onAttached: (event) => {
        derivedTrustedDeviceAttached.push(event)
      },
      pollIntervalMs: 0,
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: null,
    })
    expect(derivedTrustedDeviceAttached).toEqual([
      {
        action: "remoteRuntime.client.attached",
        createdAt: "2026-05-16T00:00:01.000Z",
        details: { gatewayRuntimeAttachmentId: "gra_1" },
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_derived",
      },
    ])

    const reusedRuntimeAttached: Record<string, unknown>[] = []
    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_old",
      listAuditEvents: async () => [
        {
          action: "remoteRuntime.client.attached",
          createdAt: "2026-05-15T00:00:00.000Z",
          details: { gatewayRuntimeAttachmentId: "gra_new" },
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_1",
        },
      ],
      minCreatedAt: "2026-05-14T00:00:00.000Z",
      onAttached: (event) => {
        reusedRuntimeAttached.push(event)
      },
      pollIntervalMs: 0,
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: "tmd_1",
    })
    expect(reusedRuntimeAttached).toEqual([
      {
        action: "remoteRuntime.client.attached",
        createdAt: "2026-05-15T00:00:00.000Z",
        details: { gatewayRuntimeAttachmentId: "gra_new" },
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      },
    ])
  })

  test("monitor accepts the current mobile pairing audit event name", async () => {
    const attached: Record<string, unknown>[] = []
    await monitorRemoteRuntimeSetupAttachment({
      gatewayRuntimeAttachmentId: "gra_1",
      listAuditEvents: async () => [
        {
          action: mobilePairingAcceptedAuditEventAction,
          createdAt: "2026-05-16T00:00:00.000Z",
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_mobile",
        },
        {
          action: "remoteRuntime.client.attached",
          createdAt: "2026-05-16T00:00:01.000Z",
          details: { gatewayRuntimeAttachmentId: "gra_1", clientAttachmentId: "mda_1" },
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_mobile",
        },
      ],
      minCreatedAt: "2026-05-15T00:00:00.000Z",
      onAttached: (event) => {
        attached.push(event)
      },
      pollIntervalMs: 0,
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: null,
    })

    expect(attached).toEqual([
      {
        action: "remoteRuntime.client.attached",
        createdAt: "2026-05-16T00:00:01.000Z",
        details: { gatewayRuntimeAttachmentId: "gra_1", clientAttachmentId: "mda_1" },
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_mobile",
      },
    ])
  })

  test("orders runtime connection candidates by priority then explicit id", () => {
    const high = { candidateId: "z-candidate", priority: 10, value: "high" }
    const first = { candidateId: "a-candidate", priority: 0, value: "first" }
    const second = { candidateId: "b-candidate", priority: 0, value: "second" }
    const input = [high, second, first]
    expect(orderRemoteRuntimeConnectionCandidates(input)).toEqual([first, second, high])
    expect(input).toEqual([high, second, first])
  })

  test("builds runtime connection candidate bootstraps with normalized URLs", () => {
    expect(
      buildRemoteRuntimeConnectionCandidateBootstrap({
        baseHttpUrl: "https://runtime.test/base/path?token=1#hash",
        candidateId: "candidate-1",
        edgeAccess: { provider: "edge" },
        environment: "tunnel",
        expiresAt: "2026-01-01T00:00:00.000Z",
        hostReachability: "public",
        kind: "cloudflareTunnel",
        localRuntimeAccessToken: "runtime-token",
        localRuntimeAccessTokenId: "runtime-token-id",
        priority: 10,
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey: { keyId: "signing-key" },
        webSocketUrl: "wss://runtime.test/socket?token=1",
      }),
    ).toEqual({
      baseHttpUrl: "https://runtime.test",
      candidateId: "candidate-1",
      edgeAccess: { provider: "edge" },
      environment: "tunnel",
      expiresAt: "2026-01-01T00:00:00.000Z",
      hostReachability: "public",
      kind: "cloudflareTunnel",
      localRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      priority: 10,
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey: { keyId: "signing-key" },
      webSocketUrl: "wss://runtime.test/socket?token=1",
    })

    expect(
      buildRemoteRuntimeConnectionCandidateBootstrap(
        {
          baseHttpUrl: "http://127.0.0.1:4096/base/path?token=1",
          candidateId: "candidate-2",
          expiresAt: "2026-01-01T00:00:00.000Z",
          kind: "direct",
          localRuntimeAccessToken: "runtime-token",
          localRuntimeAccessTokenId: "runtime-token-id",
          priority: 0,
          runtimeInstallationId: "runtime-1",
          runtimeResponseSigningPublicKey: "signing-key",
        },
        { preserveBasePath: true },
      ),
    ).toEqual({
      baseHttpUrl: "http://127.0.0.1:4096/base/path",
      candidateId: "candidate-2",
      edgeAccess: null,
      expiresAt: "2026-01-01T00:00:00.000Z",
      kind: "direct",
      localRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      priority: 0,
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey: "signing-key",
      webSocketUrl: "ws://127.0.0.1:4096/base/path/remote-runtime/socket",
    })
  })

  test("builds and completes runtime connection candidates in explicit order", () => {
    const candidates = buildRemoteRuntimeConnectionCandidateBootstraps([
      {
        baseHttpUrl: "https://runtime.test/z",
        candidateId: "candidate-z",
        expiresAt: "2026-01-01T00:00:00.000Z",
        kind: "cloudflareTunnel",
        localRuntimeAccessToken: "runtime-token-z",
        localRuntimeAccessTokenId: "runtime-token-id-z",
        priority: 10,
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey: "signing-key-z",
      },
      {
        baseHttpUrl: "http://127.0.0.1:4096/direct/base",
        candidateId: "candidate-a",
        expiresAt: "2026-01-01T00:00:00.000Z",
        kind: "direct",
        localRuntimeAccessToken: "runtime-token-a",
        localRuntimeAccessTokenId: "runtime-token-id-a",
        priority: 0,
        runtimeInstallationId: "runtime-1",
        runtimeResponseSigningPublicKey: "signing-key-a",
      },
    ])

    expect(candidates.map((candidate) => candidate.candidateId)).toEqual(["candidate-a", "candidate-z"])
    expect(candidates[0]?.baseHttpUrl).toBe("http://127.0.0.1:4096/direct/base")
    expect(
      completeRemoteRuntimeConnectionCandidates({
        bootstraps: candidates,
        remoteRuntimeRequestSigningKeyId: "mobile-key-1",
        trustedRuntimeClientId: "device-1",
      }).map((candidate) => ({
        candidateId: candidate.candidateId,
        remoteRuntimeRequestSigningKeyId: candidate.remoteRuntimeRequestSigningKeyId,
        trustedRuntimeClientId: candidate.trustedRuntimeClientId,
      })),
    ).toEqual([
      {
        candidateId: "candidate-a",
        remoteRuntimeRequestSigningKeyId: "mobile-key-1",
        trustedRuntimeClientId: "device-1",
      },
      {
        candidateId: "candidate-z",
        remoteRuntimeRequestSigningKeyId: "mobile-key-1",
        trustedRuntimeClientId: "device-1",
      },
    ])
  })

  test("deduplicates remote runtime trusted-device authorities by explicit device id", () => {
    const first = { publicKey: "public-key-1", trustedRuntimeClientId: "device-1", source: "first" }
    const duplicate = { publicKey: "public-key-duplicate", trustedRuntimeClientId: "device-1", source: "duplicate" }
    const second = { publicKey: "public-key-2", trustedRuntimeClientId: "device-2", source: "second" }
    expect(
      deduplicateRemoteRuntimeTrustedDeviceAuthorities([
        { publicKey: " ", trustedRuntimeClientId: "blank-key", source: "blank-key" },
        { publicKey: "public-key-blank-id", trustedRuntimeClientId: " ", source: "blank-id" },
        first,
        duplicate,
        second,
      ]),
    ).toEqual([first, second])
  })

  test("merges local gateway trusted-device authorities with explicit primary authority", () => {
    const authority = {
      expectedLocalRuntimeAccessToken: "token-1",
      localRuntimeAccessTokenId: "token-id-1",
      trustedRuntimeClientAuthorities: [{ publicKey: "existing-key", trustedRuntimeClientId: "existing-device" }],
      trustedRuntimeClientId: "current-device",
      trustedRuntimeClientPublicKey: "current-key",
    }
    expect(
      mergeRemoteRuntimeLocalGatewayTrustedDeviceAuthorities(authority, [
        { publicKey: "preferred-key", trustedRuntimeClientId: "preferred-device" },
        { publicKey: "duplicate-preferred", trustedRuntimeClientId: "preferred-device" },
      ]),
    ).toEqual({
      ...authority,
      trustedRuntimeClientAuthorities: [
        { publicKey: "preferred-key", trustedRuntimeClientId: "preferred-device" },
        { publicKey: "existing-key", trustedRuntimeClientId: "existing-device" },
        { publicKey: "current-key", trustedRuntimeClientId: "current-device" },
      ],
      trustedRuntimeClientId: "preferred-device",
      trustedRuntimeClientPublicKey: "preferred-key",
    })

    expect(
      mergeRemoteRuntimeLocalGatewayTrustedDeviceAuthorities(
        {
          trustedRuntimeClientAuthorities: [{ publicKey: " ", trustedRuntimeClientId: " " }],
          trustedRuntimeClientId: "current-device",
          trustedRuntimeClientPublicKey: "current-key",
        },
        [],
      ),
    ).toEqual({
      trustedRuntimeClientAuthorities: [{ publicKey: "current-key", trustedRuntimeClientId: "current-device" }],
      trustedRuntimeClientId: "current-device",
      trustedRuntimeClientPublicKey: "current-key",
    })
  })

  test("builds setup local gateway authority from runtime credential or existing authority", () => {
    const runtimeResponseSigningPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-25T00:00:00.000Z",
      encoding: "base64url",
      keyId: "runtime-public-key",
      publicKey: "RuntimePublicKey0123_-",
      purpose: "runtimeResponseSigning",
    } as const
    expect(
      parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential({
        expectedLocalRuntimeAccessToken: "runtime-token",
        localRuntimeAccessTokenId: "runtime-token-id",
        runtimeResponseSigningPrivateKey: {
          algorithm: "ed25519",
          encoding: "pkcs8-base64url",
          keyId: "runtime-private-key",
          privateKey: "runtime-private-key-material",
          purpose: "runtimeResponseSigning",
        },
        runtimeResponseSigningPublicKey,
        trustedRuntimeClientAuthorities: [{ publicKey: "trusted-key", trustedRuntimeClientId: "trusted-device" }],
        trustedRuntimeClientId: "device-1",
        trustedRuntimeClientPublicKey: "device-key-1",
      }),
    ).toEqual({
      expectedLocalRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      runtimeResponseSigningPrivateKey: {
        algorithm: "ed25519",
        encoding: "pkcs8-base64url",
        keyId: "runtime-private-key",
        privateKey: "runtime-private-key-material",
        purpose: "runtimeResponseSigning",
      },
      runtimeResponseSigningPublicKey,
      trustedRuntimeClientAuthorities: [{ publicKey: "trusted-key", trustedRuntimeClientId: "trusted-device" }],
      trustedRuntimeClientId: "device-1",
      trustedRuntimeClientPublicKey: "device-key-1",
    })
    expect(
      parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential({
        expectedLocalRuntimeAccessToken: "runtime-token",
        localRuntimeAccessTokenId: "runtime-token-id",
        trustedMobileDeviceAuthorities: [{ publicKey: "trusted-key", trustedMobileDeviceId: "trusted-device" }],
        trustedMobileDeviceId: "device-1",
        trustedMobileDevicePublicKey: "device-key-1",
      }),
    ).toEqual({
      expectedLocalRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      trustedRuntimeClientAuthorities: [{ publicKey: "trusted-key", trustedRuntimeClientId: "trusted-device" }],
      trustedRuntimeClientId: "device-1",
      trustedRuntimeClientPublicKey: "device-key-1",
    })
    expect(
      parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential({
        expectedLocalRuntimeAccessToken: "runtime-token",
        localRuntimeAccessTokenId: "runtime-token-id",
        trustedRuntimeClientId: "device-1",
        trustedRuntimeClientPublicKey: "device-key-1",
      }),
    ).toEqual({
      expectedLocalRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      trustedRuntimeClientId: "device-1",
      trustedRuntimeClientPublicKey: "device-key-1",
    })
    expect(() =>
      parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential({
        expectedLocalRuntimeAccessToken: "runtime-token",
        localRuntimeAccessTokenId: "runtime-token-id",
        trustedRuntimeClientId: "device-1",
      }),
    ).toThrow("invalid schema")

    expect(
      remoteRuntimeSetupLocalGatewayAuthority({
        localRuntimeCredential: {
          localRuntimeAccessToken: "runtime-token",
          localRuntimeAccessTokenId: "runtime-token-id",
        },
        runtimeResponseSigningPrivateKey: { keyId: "private-key" },
        runtimeResponseSigningPublicKey: { keyId: "public-key" },
        trustedRuntimeClientId: "device-1",
        trustedRuntimeClientPublicKey: "device-key-1",
      }),
    ).toEqual({
      expectedLocalRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      runtimeResponseSigningPrivateKey: { keyId: "private-key" },
      runtimeResponseSigningPublicKey: { keyId: "public-key" },
      trustedRuntimeClientAuthorities: [{ publicKey: "device-key-1", trustedRuntimeClientId: "device-1" }],
      trustedRuntimeClientId: "device-1",
      trustedRuntimeClientPublicKey: "device-key-1",
    })

    expect(
      remoteRuntimeSetupLocalGatewayAuthority({
        existingLocalGatewayAuthority: {
          expectedLocalRuntimeAccessToken: "existing-token",
          localRuntimeAccessTokenId: "existing-token-id",
          trustedRuntimeClientAuthorities: [{ publicKey: "existing-key", trustedRuntimeClientId: "existing-device" }],
          trustedRuntimeClientId: "existing-device",
          trustedRuntimeClientPublicKey: "existing-key",
        },
        trustedRuntimeClientId: "device-2",
        trustedRuntimeClientPublicKey: "device-key-2",
      }),
    ).toEqual({
      expectedLocalRuntimeAccessToken: "existing-token",
      localRuntimeAccessTokenId: "existing-token-id",
      trustedRuntimeClientAuthorities: [
        { publicKey: "device-key-2", trustedRuntimeClientId: "device-2" },
        { publicKey: "existing-key", trustedRuntimeClientId: "existing-device" },
      ],
      trustedRuntimeClientId: "device-2",
      trustedRuntimeClientPublicKey: "device-key-2",
    })

    expect(
      remoteRuntimeSetupLocalGatewayAuthority({
        trustedRuntimeClientId: "device-3",
        trustedRuntimeClientPublicKey: "device-key-3",
      }),
    ).toBeUndefined()
  })

  test("projects trusted-device authorities from local gateway authority", () => {
    expect(
      parseRemoteRuntimeTrustedDeviceAuthority({ publicKey: "public-key", trustedRuntimeClientId: "device-1" }),
    ).toEqual({
      publicKey: "public-key",
      trustedRuntimeClientId: "device-1",
    })
    expect(() => parseRemoteRuntimeTrustedDeviceAuthority({ publicKey: "public-key" })).toThrow("invalid schema")
    expect(remoteRuntimeTrustedDeviceAuthoritiesFromLocalGatewayAuthority()).toEqual([])
    expect(
      remoteRuntimeTrustedDeviceAuthoritiesFromLocalGatewayAuthority({
        trustedRuntimeClientAuthorities: [
          { publicKey: "existing-key", trustedRuntimeClientId: "existing-device" },
          { publicKey: "duplicate-existing", trustedRuntimeClientId: "existing-device" },
        ],
        trustedRuntimeClientId: "current-device",
        trustedRuntimeClientPublicKey: "current-key",
      }),
    ).toEqual([
      { publicKey: "existing-key", trustedRuntimeClientId: "existing-device" },
      { publicKey: "current-key", trustedRuntimeClientId: "current-device" },
    ])
  })

  test("projects trusted-device authorities from trusted device records", () => {
    expect(
      remoteRuntimeTrustedDeviceAuthoritiesFromTrustedDeviceRecords({
        runtimeInstallationId: "runtime-1",
        devices: [
          {
            publicKey: "public-key-1",
            runtimeInstallationId: "runtime-1",
            state: "trusted",
            trustedRuntimeClientId: "device-1",
          },
          {
            publicKey: "duplicate-key",
            runtimeInstallationId: "runtime-1",
            state: "trusted",
            trustedRuntimeClientId: "device-1",
          },
          {
            publicKey: "public-key-2",
            runtimeInstallationId: "runtime-1",
            state: "trusted",
            trustedRuntimeClientId: "device-2",
          },
          {
            publicKey: "public-key-other-runtime",
            runtimeInstallationId: "runtime-2",
            state: "trusted",
            trustedRuntimeClientId: "device-3",
          },
          {
            publicKey: "public-key-revoked",
            runtimeInstallationId: "runtime-1",
            state: "revoked",
            trustedRuntimeClientId: "device-4",
          },
          { publicKey: null, runtimeInstallationId: "runtime-1", state: "trusted", trustedRuntimeClientId: "device-5" },
          { publicKey: " ", runtimeInstallationId: "runtime-1", state: "trusted", trustedRuntimeClientId: "device-6" },
        ],
      }),
    ).toEqual([
      { publicKey: "public-key-1", trustedRuntimeClientId: "device-1" },
      { publicKey: "public-key-2", trustedRuntimeClientId: "device-2" },
    ])
  })

  test("projects trusted-device authorities from setup audit events", () => {
    const events = [
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-01T00:00:00.000Z",
        details: { publicKey: "old-key" },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-1",
      },
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-02T00:00:00.000Z",
        details: { publicKey: "new-key" },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "device-1",
      },
      {
        action: remoteRuntimeDeviceRevokedAuditEventAction,
        createdAt: "2026-01-03T00:00:00.000Z",
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "revoked-device",
      },
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-02T00:00:00.000Z",
        details: { publicKey: "revoked-key" },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "revoked-device",
      },
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-02T00:00:00.000Z",
        details: { publicKey: "other-runtime-key" },
        runtimeInstallationId: "runtime-2",
        trustedRuntimeClientId: "other-runtime-device",
      },
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-02T00:00:00.000Z",
        details: { publicKey: " " },
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "blank-key-device",
      },
      {
        action: remoteRuntimePairingAcceptedAuditEventAction,
        createdAt: "2026-01-02T00:00:00.000Z",
        details: null,
        runtimeInstallationId: "runtime-1",
        trustedRuntimeClientId: "missing-key-device",
      },
    ]

    expect(
      remoteRuntimeTrustedDeviceAuthoritiesFromSetupAuditEvents({ events, runtimeInstallationId: "runtime-1" }),
    ).toEqual([{ publicKey: "new-key", trustedRuntimeClientId: "device-1" }])
  })
})
