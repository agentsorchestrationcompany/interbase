import { Context, Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { FetchHttpClient, HttpMiddleware, HttpRouter, HttpServer } from "effect/unstable/http"
import * as Socket from "effect/unstable/socket/Socket"
import { createAccountLayer } from "@/account/account"
import { Agent } from "@/agent/agent"
import { Auth } from "@/auth"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { Command } from "@/command"
import * as Observability from "@interbase/core/effect/observability"
import { File } from "@/file"
import { FileWatcher } from "@/file/watcher"
import { Ripgrep } from "@/file/ripgrep"
import { Format } from "@/format"
import { LSP } from "@/lsp/lsp"
import { MCP } from "@/mcp"
import { Permission } from "@/permission"
import { Installation } from "@/installation"
import { InstanceLayer } from "@/project/instance-layer"
import { Plugin } from "@/plugin"
import { Project } from "@/project/project"
import { ProviderAuth } from "@/provider/auth"
import { ModelsDev } from "@/provider/models"
import { Provider } from "@/provider/provider"
import { Pty } from "@/pty"
import { PtyTicket } from "@/pty/ticket"
import { Question } from "@/question"
import { Session } from "@/session/session"
import { SessionCompaction } from "@/session/compaction"
import { SessionPrompt } from "@/session/prompt"
import { SessionRevert } from "@/session/revert"
import { SessionRunState } from "@/session/run-state"
import { SessionStatus } from "@/session/status"
import { SessionSummary } from "@/session/summary"
import { Todo } from "@/session/todo"
import { Skill } from "@/skill"
import { Snapshot } from "@/snapshot"
import { SyncEvent } from "@/sync"
import { ToolRegistry } from "@/tool/registry"
import { lazy } from "@/util/lazy"
import { Vcs } from "@/project/vcs"
import { Worktree } from "@/worktree"
import { CorsConfig, isAllowedCorsOrigin, type CorsOptions } from "@/server/cors"
import { ServerAuth } from "@/server/auth"
import { InstanceHttpApi, RootHttpApi } from "./api"
import { authorizationLayer, authorizationRouterMiddleware } from "./middleware/authorization"
import { EventApi, eventHandlers } from "./event"
import { configHandlers } from "./handlers/config"
import { controlHandlers } from "./handlers/control"
import { experimentalHandlers } from "./handlers/experimental"
import { fileHandlers } from "./handlers/file"
import { globalHandlers } from "./handlers/global"
import { instanceHandlers } from "./handlers/instance"
import { mcpHandlers } from "./handlers/mcp"
import { permissionHandlers } from "./handlers/permission"
import { projectHandlers } from "./handlers/project"
import { providerHandlers } from "./handlers/provider"
import { ptyConnectRoute, ptyHandlers } from "./handlers/pty"
import { questionHandlers } from "./handlers/question"
import { sessionHandlers } from "./handlers/session"
import { syncHandlers } from "./handlers/sync"
import { tuiHandlers } from "./handlers/tui"
import { v2Handlers } from "./handlers/v2"
import { instanceContextLayer, instanceRouterMiddleware } from "./middleware/instance-context"
import { disposeMiddleware } from "./lifecycle"
import { memoMap } from "@interbase/core/effect/memo-map"
import * as ServerBackend from "@/server/backend"
import {
  ACTIVE_FEATURE_ASSEMBLY,
  ACTIVE_FEATURE_BUNDLES,
  activeFeatureBundleLayer,
  activeFeatureOwnedLayer,
  type FeatureAssemblyState,
} from "@/feature/assembly"
import type { FeatureBundle } from "@/feature/bundle"
import { ProviderAccountAuthority } from "@/account/authority"

export const context = Context.makeUnsafe<unknown>(new Map())

const runtime = HttpRouter.middleware()(
  Effect.succeed((effect) =>
    Effect.gen(function* () {
      const selected = ServerBackend.select()
      yield* Effect.annotateCurrentSpan(ServerBackend.attributes(ServerBackend.force(selected, "effect-httpapi")))
      return yield* effect
    }),
  ),
).layer

const cors = (corsOptions?: CorsOptions) =>
  HttpRouter.middleware(
    HttpMiddleware.cors({
      allowedOrigins: (origin) => isAllowedCorsOrigin(origin, corsOptions),
      maxAge: 86_400,
    }),
    { global: true },
  )

const rootApiRoutes = HttpApiBuilder.layer(RootHttpApi).pipe(Layer.provide([controlHandlers, globalHandlers]))
function createInstanceRouterLayer(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  void bundles
  return authorizationRouterMiddleware
    .combine(instanceRouterMiddleware)
    .layer.pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal), Layer.provide(ServerAuth.Config.defaultLayer))
}
function createEventApiRoutes(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  return HttpApiBuilder.layer(EventApi).pipe(
    Layer.provide(eventHandlers),
    Layer.provide(createInstanceRouterLayer(bundles)),
  )
}
function createInstanceApiRoutes(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  return HttpApiBuilder.layer(InstanceHttpApi).pipe(
    Layer.provide([
      configHandlers,
      experimentalHandlers,
      fileHandlers,
      instanceHandlers,
      mcpHandlers,
      projectHandlers,
      ptyHandlers,
      questionHandlers,
      permissionHandlers,
      providerHandlers,
      sessionHandlers,
      syncHandlers,
      v2Handlers,
      tuiHandlers,
    ]),
  )
}

function createInstanceRoutes(bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  const instanceRouterLayer = createInstanceRouterLayer(bundles)
  const rawInstanceRoutes = Layer.mergeAll(ptyConnectRoute).pipe(Layer.provide(instanceRouterLayer))
  return Layer.mergeAll(rawInstanceRoutes, createInstanceApiRoutes(bundles)).pipe(
    Layer.provide([
      authorizationLayer.pipe(Layer.provide(ServerAuth.Config.defaultLayer)),
      instanceContextLayer,
    ]),
  )
}

export function createRoutes(corsOptions?: CorsOptions, bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  return Layer.mergeAll(rootApiRoutes, createEventApiRoutes(bundles), createInstanceRoutes(bundles)).pipe(
    Layer.provide([
      cors(corsOptions),
      runtime,
      createAccountLayer(
        activeFeatureOwnedLayer(
          "provider-account-authority",
          ProviderAccountAuthority.defaultLayer,
          bundles,
        ) as Layer.Layer<ProviderAccountAuthority.Service>,
      ),
      Agent.defaultLayer,
      Auth.defaultLayer,
      Command.defaultLayer,
      Config.defaultLayer,
      File.defaultLayer,
      FileWatcher.defaultLayer,
      Format.defaultLayer,
      LSP.defaultLayer,
      Installation.defaultLayer,
      MCP.defaultLayer,
      ModelsDev.defaultLayer,
      Permission.defaultLayer,
      Plugin.defaultLayer,
      Project.defaultLayer,
      ProviderAuth.defaultLayer,
      Provider.defaultLayer,
      Pty.defaultLayer,
      PtyTicket.defaultLayer,
      Question.defaultLayer,
      Ripgrep.defaultLayer,
      Session.defaultLayer,
      SessionCompaction.defaultLayer,
      SessionPrompt.defaultLayer,
      SessionRevert.defaultLayer,
      SessionRunState.defaultLayer,
      SessionStatus.defaultLayer,
      SessionSummary.defaultLayer,
      Snapshot.defaultLayer,
      SyncEvent.defaultLayer,
      Skill.defaultLayer,
      Todo.defaultLayer,
      ToolRegistry.defaultLayer,
      Vcs.defaultLayer,
      Worktree.appLayer,
      Bus.layer,
      FetchHttpClient.layer,
      HttpServer.layerServices,
      activeFeatureBundleLayer(bundles),
    ]),
    Layer.provideMerge(Layer.succeed(CorsConfig)(corsOptions)),
    Layer.provideMerge(InstanceLayer.layer),
    Layer.provideMerge(Observability.layer),
  )
}

export function createRoutesFromFeatureAssembly(
  corsOptions?: CorsOptions,
  assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY,
) {
  return createRoutes(corsOptions, assembly.bundles).pipe(
    Layer.provide(
      createAccountLayer(
        assembly.ownedLayer(
          "provider-account-authority",
          ProviderAccountAuthority.defaultLayer,
        ) as Layer.Layer<ProviderAccountAuthority.Service>,
      ),
    ),
  )
}

export const routes = createRoutesFromFeatureAssembly(undefined, ACTIVE_FEATURE_ASSEMBLY)

const defaultWebHandler = lazy(() =>
  HttpRouter.toWebHandler(routes, {
    memoMap,
    middleware: disposeMiddleware,
  }),
)

export function webHandler(corsOptions?: CorsOptions, bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES) {
  if (!corsOptions?.cors?.length && bundles === ACTIVE_FEATURE_BUNDLES) return defaultWebHandler()
  return HttpRouter.toWebHandler(createRoutes(corsOptions, bundles), {
    // Server-level CORS options are dynamic; don't reuse the default route layer memoized without them.
    memoMap: Layer.makeMemoMapUnsafe(),
    middleware: disposeMiddleware,
  })
}

export * as ExperimentalHttpApiServer from "./server"
