# HttpApi Route Patterns

## Interbase Extension Boundary

- Mandatory: Interbase-owned functionality added on top of the OpenCode CLI must live in Interbase-owned packages, plugins, or app code outside `vendor/opencode` whenever it is more than a narrow host integration seam.
- Mandatory: vendored OpenCode files must not become the authority for Interbase product behavior, business logic, protocol handling, state management, API clients, runtime managers, background services, or command workflows.
- Mandatory: when OpenCode CLI integration is required, keep vendored edits limited to thin adapters: command or route registration, request/response validation at the host boundary, dependency injection, capability wiring, and delegation into Interbase-owned modules.
- Mandatory: any unavoidable vendored OpenCode patch for Interbase behavior must be justified as an adapter seam in the change summary and structured so future upstream OpenCode refreshes can replay it without preserving product logic in vendored files.
- Mandatory: before adding code under `vendor/opencode` for an Interbase CLI feature, agents must first create or extend an Interbase-owned package or plugin API and then call that API from the vendored adapter.

Use `HttpApiBuilder.group(...)` for normal HTTP endpoints, including streaming HTTP responses such as server-sent events. Handlers should yield stable services once while building the handler layer, then close over those services in endpoint implementations.

```ts
export const sessionHandlers = HttpApiBuilder.group(InstanceHttpApi, "session", (handlers) =>
  Effect.gen(function* () {
    const session = yield* Session.Service

    return handlers.handle("list", () => session.list())
  }),
)
```

For SSE endpoints, stay in `HttpApiBuilder.group(...)` and return `HttpServerResponse.stream(...)` from the handler. Annotate the endpoint success schema with `HttpApiSchema.asText({ contentType: "text/event-stream" })` so OpenAPI documents the stream content type.

Use raw `HttpRouter.use(...)` only for routes that do not fit the request/response HttpApi model, such as WebSocket upgrade routes or catch-all fallback routes. Yield stable services at route-layer construction and close over them in `router.add(...)` callbacks.

```ts
export const rawRoute = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const pty = yield* Pty.Service

    yield* router.add("GET", PtyPaths.connect, (request) => connectPty(request, pty))
  }),
)
```

Avoid `Effect.provide(SomeLayer)` inside request handlers or raw route callbacks. Stable layers should be provided once at the application/layer boundary, not rebuilt or scoped per request.

Avoid `HttpRouter.provideRequest(...)` unless the dependency is intentionally request-level. Prefer `HttpRouter.use(...)` for stable app services.

Use `Effect.provideService(...)` in middleware only for request-derived context, such as `WorkspaceRouteContext`, `InstanceRef`, or `WorkspaceRef`. Do not use it to smuggle stable services through request effects when they can be yielded at layer construction.

When adding middleware, compose it at the layer boundary and keep the route tree explicit in `server.ts`. Shared router middleware such as auth, workspace routing, and instance context should stay visible where routes are assembled.
