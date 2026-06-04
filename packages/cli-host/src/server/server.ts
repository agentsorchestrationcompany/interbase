import { generateSpecs } from "hono-openapi"
import { Hono } from "hono"
import { adapter } from "#hono"
import { lazy } from "@/util/lazy"
import * as Log from "@interbase/core/util/log"
import { ConfigProvider, Context, Effect, Exit, Layer, Scope } from "effect"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { OpenApi } from "effect/unstable/httpapi"
import * as HttpApiServer from "#httpapi-server"
import { MDNS } from "./mdns"
import { AuthMiddleware, CompressionMiddleware, CorsMiddleware, ErrorMiddleware, LoggerMiddleware } from "./middleware"
import { initProjectors } from "./projectors"
import { InstanceRoutes } from "./routes/instance"
import { InstanceMiddleware } from "./routes/instance/middleware"
import { ControlPlaneRoutes } from "./routes/control"
import { GlobalRoutes } from "./routes/global"
import { ExperimentalHttpApiServer } from "./routes/instance/httpapi/server"
import { disposeMiddleware } from "./routes/instance/httpapi/lifecycle"
import { WebSocketTracker } from "./routes/instance/httpapi/websocket-tracker"
import { createPublicApi } from "./routes/instance/httpapi/public"
import * as ServerBackend from "./backend"
import type { CorsOptions } from "./cors"
import {
  ACTIVE_FEATURE_ASSEMBLY,
  ACTIVE_FEATURE_BUNDLES,
  type FeatureAssemblyState,
} from "@/feature/assembly"
import type { FeatureBundle } from "@/feature/bundle"
import { AppRuntime, createAppRuntimeFromFeatureAssembly, type AppRuntimeLike } from "@/effect/app-runtime"

// @ts-ignore This global is needed to prevent ai-sdk from logging warnings to stdout https://github.com/vercel/ai/blob/2dc67e0ef538307f21368db32d5a12345d98831b/packages/ai/src/logger/log-warnings.ts#L85
globalThis.AI_SDK_LOG_WARNINGS = false

initProjectors()

const log = Log.create({ service: "server" })

export type Listener = {
  hostname: string
  port: number
  url: URL
  stop: (close?: boolean) => Promise<void>
}

type ServerApp = {
  fetch(request: Request): Response | Promise<Response>
  request(input: string | URL | Request, init?: RequestInit): Response | Promise<Response>
}

type ListenOptions = CorsOptions & {
  port: number
  hostname: string
  mdns?: boolean
  mdnsDomain?: string
}

const DefaultHono = lazy(() =>
  withBackend(
    { backend: "hono", reason: "stable" },
    createHonoFromFeatureAssembly({}, { backend: "hono", reason: "stable" }, ACTIVE_FEATURE_ASSEMBLY),
  ),
)
const DefaultHttpApi = lazy(() => createDefaultHttpApiFromFeatureAssembly(ACTIVE_FEATURE_ASSEMBLY))

function select() {
  return ServerBackend.select()
}

export const backend = select

export const Default = () => {
  const selected = select()
  return selected.backend === "effect-httpapi" ? DefaultHttpApi() : DefaultHono()
}

function create(opts: ListenOptions, bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  const selected = select()
  return selected.backend === "effect-httpapi"
    ? withBackend(selected, createHttpApi(opts, bundles))
    : withBackend(selected, createHono(opts, selected, bundles))
}

export function createFromFeatureAssembly(
  opts: ListenOptions,
  assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY,
) {
  const selected = select()
  return selected.backend === "effect-httpapi"
    ? withBackend(selected, createHttpApiFromFeatureAssembly(opts, assembly))
    : withBackend(selected, createHonoFromFeatureAssembly(opts, selected, assembly))
}

export function Legacy(opts: CorsOptions = {}) {
  return withBackend(
    { backend: "hono", reason: "explicit" },
    createHono(opts, { backend: "hono", reason: "explicit" }, ACTIVE_FEATURE_BUNDLES),
  )
}

function createDefaultHttpApi(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  return withBackend(select(), createHttpApi(undefined, bundles))
}

function createDefaultHttpApiFromFeatureAssembly(assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY) {
  return withBackend(select(), createHttpApiFromFeatureAssembly(undefined, assembly))
}

function withBackend<T extends { app: ServerApp; runtime: unknown }>(selection: ServerBackend.Selection, built: T) {
  log.info("server backend selected", ServerBackend.attributes(selection))
  return built
}

function createHttpApi(corsOptions?: CorsOptions, bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  const handler = ExperimentalHttpApiServer.webHandler(corsOptions, bundles).handler
  const app: ServerApp = {
    fetch: (request: Request) => handler(request, ExperimentalHttpApiServer.context),
    request(input, init) {
      return app.fetch(input instanceof Request ? input : new Request(new URL(input, "http://localhost"), init))
    },
  }
  return {
    app,
    runtime: adapter.createFetch(app),
  }
}

function createHttpApiFromFeatureAssembly(
  corsOptions?: CorsOptions,
  assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY,
) {
  const handler = HttpRouter.toWebHandler(
    ExperimentalHttpApiServer.createRoutesFromFeatureAssembly(corsOptions, assembly),
    {
      memoMap: Layer.makeMemoMapUnsafe(),
      middleware: disposeMiddleware,
    },
  ).handler
  const app: ServerApp = {
    fetch: (request: Request) => handler(request, ExperimentalHttpApiServer.context),
    request(input, init) {
      return app.fetch(input instanceof Request ? input : new Request(new URL(input, "http://localhost"), init))
    },
  }
  return {
    app,
    runtime: adapter.createFetch(app),
  }
}

function createHono(
  opts: CorsOptions,
  selection: ServerBackend.Selection = ServerBackend.force(select(), "hono"),
  bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES,
  runtimeApi: AppRuntimeLike = AppRuntime,
) {
  const backendAttributes = ServerBackend.attributes(selection)
  const app = new Hono()
    .onError(ErrorMiddleware)
    .use(AuthMiddleware)
    .use(LoggerMiddleware(backendAttributes))
    .use(CompressionMiddleware)
    .use(CorsMiddleware(opts))

  const runtime = adapter.create(app)
  app.route("/global", GlobalRoutes(runtime.upgradeWebSocket, runtimeApi, bundles))
  const instanceApp = new Hono().use(InstanceMiddleware()).route(
    "/",
    InstanceRoutes(runtime.upgradeWebSocket, opts, bundles, runtimeApi),
  )

  return {
    app: app.route("/", ControlPlaneRoutes(runtimeApi)).route("/", instanceApp),
    runtime,
  }
}

function createHonoFromFeatureAssembly(
  opts: CorsOptions,
  selection: ServerBackend.Selection = ServerBackend.force(select(), "hono"),
  assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY,
) {
  return createHono(opts, selection, assembly.bundles, createAppRuntimeFromFeatureAssembly(assembly))
}

/**
 * Generate the OpenAPI document used by the SDK build.
 *
 * Since the Effect HttpApi backend now covers every Hono route (plus the new
 * `/api/session/*` v2 routes — see `httpapi-bridge.test.ts` for the parity
 * audit), `Server.openapi()` derives the spec from `OpenApi.fromApi(PublicApi)`.
 * `PublicApi` is `OpenCodeHttpApi` annotated with the `matchLegacyOpenApi`
 * transform that injects instance query parameters, strips Effect's optional
 * null arms, normalizes component names, and patches SSE response schemas so
 * the generated SDK keeps the legacy Hono shape.
 *
 * The Hono-derived spec is still reachable via `openapiHono()` so reviewers
 * can diff the two outputs while the Hono backend lingers; once the Hono
 * backend is deleted that helper goes with it.
 */
export async function openapi(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  return OpenApi.fromApi(createPublicApi(bundles))
}

/**
 * Hono-derived OpenAPI spec, retained for parity diffing only. Delete once
 * the Hono backend is removed.
 */
export async function openapiHono(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  // Build a fresh app with all routes registered directly so
  // hono-openapi can see describeRoute metadata (`.route()` wraps
  // handlers when the sub-app has a custom errorHandler, which
  // strips the metadata symbol).
  const { app } = createHono({}, undefined, bundles)
  const result = await generateSpecs(app, {
    documentation: {
      info: {
        title: "interbase",
        version: "1.0.0",
        description: "interbase api",
      },
      openapi: "3.1.1",
    },
  })
  return result
}

export let url: URL

export async function listen(opts: ListenOptions): Promise<Listener> {
  const selected = select()
  const inner: Listener =
    selected.backend === "effect-httpapi"
      ? await listenHttpApi(opts, selected, ACTIVE_FEATURE_BUNDLES)
      : await listenLegacy(opts, ACTIVE_FEATURE_BUNDLES)

  const next = new URL(inner.url)
  url = next

  const mdns =
    opts.mdns && inner.port && opts.hostname !== "127.0.0.1" && opts.hostname !== "localhost" && opts.hostname !== "::1"
  if (mdns) {
    MDNS.publish(inner.port, opts.mdnsDomain)
  } else if (opts.mdns) {
    log.warn("mDNS enabled but hostname is loopback; skipping mDNS publish")
  }

  let closing: Promise<void> | undefined
  let mdnsUnpublished = false
  const unpublish = () => {
    if (!mdns || mdnsUnpublished) return
    mdnsUnpublished = true
    MDNS.unpublish()
  }
  return {
    hostname: inner.hostname,
    port: inner.port,
    url: next,
    stop(close?: boolean) {
      unpublish()
      // Always forward stop(true), even if a graceful stop was requested
      // first, so native listeners can escalate shutdown in-place.
      const next = inner.stop(close)
      closing ??= next
      return close ? next.then(() => closing!) : closing
    },
  }
}

async function listenLegacy(
  opts: ListenOptions,
  bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES,
): Promise<Listener> {
  const built = create(opts, bundles)
  const server = await built.runtime.listen(opts)
  const innerUrl = new URL("http://localhost")
  innerUrl.hostname = opts.hostname
  innerUrl.port = String(server.port)
  return {
    hostname: opts.hostname,
    port: server.port,
    url: innerUrl,
    stop: (close?: boolean) => server.stop(close),
  }
}

/**
 * Run the effect-httpapi backend on a native Effect HTTP server. This
 * lets HttpApi routes that call `request.upgrade` (PTY connect, the
 * workspace-routing proxy WS bridge) work end-to-end; the legacy Hono
 * adapter path can't surface `request.upgrade` because its fetch handler has
 * no reference to the platform server instance for websocket upgrades.
 */
async function listenHttpApi(
  opts: ListenOptions,
  selection: ServerBackend.Selection,
  bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES,
): Promise<Listener> {
  log.info("server backend selected", {
    ...ServerBackend.attributes(selection),
    "interbase.server.runtime": HttpApiServer.name,
  })

  const buildLayer = (port: number) =>
    HttpRouter.serve(ExperimentalHttpApiServer.createRoutes(opts, bundles), {
      middleware: disposeMiddleware,
      disableLogger: true,
      disableListenLog: true,
    }).pipe(
      Layer.provideMerge(WebSocketTracker.layer),
      Layer.provideMerge(HttpApiServer.layer({ port, hostname: opts.hostname })),
      // Install a fresh `ConfigProvider` per listener so `Config.string(...)`
      // reads reflect the current `process.env`. Effect's default
      // `ConfigProvider` snapshots `process.env` on first read and caches the
      // result on a module-singleton Reference; without overriding it here,
      // every later `Server.listen()` keeps observing that initial snapshot.
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnv())),
    )

  const start = async (port: number) => {
    const scope = Scope.makeUnsafe()
    try {
      // Effect's `HttpMiddleware` interface returns `Effect<…, any, any>` by
      // design, which leaks `R = any` through `HttpRouter.serve`. The actual
      // requirements at this point are fully satisfied by `createRoutes` and the
      // platform HTTP server layer; cast away the `any` to satisfy `runPromise`.
      const layer = buildLayer(port) as Layer.Layer<
        HttpServer.HttpServer | WebSocketTracker.Service | HttpApiServer.Service,
        unknown,
        never
      >
      const ctx = await Effect.runPromise(Layer.buildWithMemoMap(layer, Layer.makeMemoMapUnsafe(), scope))
      return { scope, ctx }
    } catch (err) {
      await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined)
      throw err
    }
  }

  // Match the legacy adapter port-resolution behavior: explicit `0` prefers
  // 4096 first, then any free port.
  let resolved: Awaited<ReturnType<typeof start>> | undefined
  if (opts.port === 0) {
    resolved = await start(4096).catch(() => undefined)
    if (!resolved) resolved = await start(0)
  } else {
    resolved = await start(opts.port)
  }
  if (!resolved) throw new Error(`Failed to start server on port ${opts.port}`)

  const server = Context.get(resolved.ctx, HttpServer.HttpServer)
  if (server.address._tag !== "TcpAddress") {
    await Effect.runPromise(Scope.close(resolved.scope, Exit.void))
    throw new Error(`Unexpected HttpServer address tag: ${server.address._tag}`)
  }
  const port = server.address.port

  const innerUrl = new URL("http://localhost")
  innerUrl.hostname = opts.hostname
  innerUrl.port = String(port)
  let forceStopPromise: Promise<void> | undefined
  let stopPromise: Promise<void> | undefined
  const forceStop = () => {
    forceStopPromise ??= Effect.runPromiseExit(
      Effect.gen(function* () {
        yield* Context.get(resolved!.ctx, HttpApiServer.Service).closeAll
        yield* Context.get(resolved!.ctx, WebSocketTracker.Service).closeAll
      }),
    ).then(() => undefined)
    return forceStopPromise
  }

  return {
    hostname: opts.hostname,
    port,
    url: innerUrl,
    stop: (close?: boolean) => {
      const requested = close ? forceStop() : Promise.resolve()
      // The first call starts scope shutdown. A later stop(true) cannot undo
      // that, but it still runs forceStop() before awaiting the original close.
      stopPromise ??= requested
        .then(() => Effect.runPromiseExit(Scope.close(resolved!.scope, Exit.void)))
        .then(() => undefined)
      return requested.then(() => stopPromise!)
    },
  }
}

export * as Server from "./server"
