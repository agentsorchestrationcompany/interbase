# Computer-Use Backend Capability Contract

Computer-use backends expose a shared protocol and advertise typed capabilities during `health` negotiation. The runtime backend is native-only; mock drivers exist only as test fixtures and are not configurable in user/runtime config.

## Platforms

- `macos`: native helper using Accessibility and Screen Recording permissions.
- `windows`: future UI Automation backend, currently not implemented.
- `linux`: future backend subject to compositor and desktop-environment limitations, currently not implemented.

## Capabilities

- `status`: health/status endpoint.
- `observe`: app/window/element observation.
- `act`: primitive guarded action endpoint.
- `screenshot`: screenshot artifact capture.
- `artifact`: session-hydratable screenshot artifact byte reads.
- `axTree`: accessibility tree capture.
- `semanticActions`: element-oriented semantic actions.

Backends may only advertise capabilities listed for their platform descriptor in `@interbase/computer-use-protocol`. Unsupported capabilities fail negotiation.

## Helper Driver Adapter

Native helpers integrate through a host-owned driver adapter. The adapter must not launch helpers directly without supervisor readiness. Observe requests may restart after a crash only after backoff; actions fail closed and are not silently retried. Crash cleanup is host-owned and revokes stale approvals plus orphaned artifacts before future helper work proceeds.

## Geometry

Backends report coordinates in explicit spaces: `desktopLogical`, `windowLogical`, or `screenshotPixel`. Multi-display layouts must preserve negative origins and per-display scale. Host-side protocol helpers convert screenshot pixels and window-relative points into desktop-logical coordinates before actions are executed.

## Contract Fixtures

`@interbase/computer-use-testkit` exports backend contract fixtures that native helpers must satisfy:

- `makeBackendContractFixture(platform)`
- `assertBackendContract(fixture)`

Native helpers must pass the same protocol fixtures as the TypeScript test driver before they are enabled.
