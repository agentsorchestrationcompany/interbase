# Instance Route Parity

## Interbase Extension Boundary

- Mandatory: Interbase-owned functionality added on top of the OpenCode CLI must live in Interbase-owned packages, plugins, or app code outside `vendor/opencode` whenever it is more than a narrow host integration seam.
- Mandatory: vendored OpenCode files must not become the authority for Interbase product behavior, business logic, protocol handling, state management, API clients, runtime managers, background services, or command workflows.
- Mandatory: when OpenCode CLI integration is required, keep vendored edits limited to thin adapters: command or route registration, request/response validation at the host boundary, dependency injection, capability wiring, and delegation into Interbase-owned modules.
- Mandatory: any unavoidable vendored OpenCode patch for Interbase behavior must be justified as an adapter seam in the change summary and structured so future upstream OpenCode refreshes can replay it without preserving product logic in vendored files.
- Mandatory: before adding code under `vendor/opencode` for an Interbase CLI feature, agents must first create or extend an Interbase-owned package or plugin API and then call that API from the vendored adapter.

This directory contains the legacy Hono instance routes and the experimental Effect HttpApi implementation under `httpapi/`. Keep them behaviorally aligned.

- When adding, removing, or changing a legacy Hono route, update the matching Effect HttpApi group and handler in `httpapi/` in the same change unless the route is intentionally unsupported.
- When changing an Effect HttpApi route, verify the legacy Hono route has the same public behavior, request shape, response shape, status codes, and instance/workspace routing semantics.
- Keep OpenAPI/SDK-visible schemas aligned. If a difference is only an OpenAPI generation artifact, prefer fixing the source schema first; use `httpapi/public.ts` normalization only for compatibility shims that cannot be represented cleanly in the source schema.
- Add or update parity coverage in `test/server/httpapi-bridge.test.ts` or the focused HttpApi tests when behavior or schema parity could regress.
