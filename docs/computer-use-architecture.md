# Computer-Use Architecture

Computer-use is split into portable packages, a host adapter layer, and a native helper prototype. The tools are enabled by default. Runtime computer-use is native-only and requires helper availability plus policy/permission checks; mock drivers are injected only by tests.

## Package Boundaries

- `@interbase/computer-use-protocol` owns shared data contracts, protocol negotiation, IPC envelope limits, driver status, backend capabilities, coordinate conversion, and primitive action validation.
- `@interbase/computer-use-protocol` also owns semantic action target resolution. Semantic requests are re-resolved against the latest observation and converted to primitive driver actions before execution.
- Display geometry is represented in desktop-logical coordinates with per-display scale metadata. Screenshot-pixel coordinates must be converted through explicit screenshot/display geometry before action execution.
- `@interbase/computer-use-policy` owns feature/app policy, denylist matching, model attachment decisions, redaction, action risk classification, rate limiting, and foreground invariants.
- `@interbase/computer-use-testkit` owns deterministic observations, sanitized trace export/import envelopes, replay helpers, and backend contract fixtures.
- `packages/cli-host/src/computer-use` owns host-only runtime concerns: audit sanitization, artifact handles and guarded byte reads, approval/revocation state, test-only driver injection seams, helper authenticity checks, helper transport, permission prompt metadata, and session serialization.
- `computer_use_artifact` and `computer_use_audit` provide structured SQLite persistence for artifact metadata and sanitized audit events; raw screenshot bytes and raw AX content are still excluded from the database.
- Helper supervision is split between a pure lifecycle supervisor and a helper-process driver adapter. The supervisor verifies authenticity before launch, validates `health` and status, records crashes, restarts observe-only work after backoff, and refuses silent action retries after crashes.
- `packages/cli-host/src/computer-use/session.ts` exposes `ComputerUse.Service`, a per-instance Effect service around the session coordinator.
- `packages/cli-host/src/tool/computer-observe.ts`, `packages/cli-host/src/tool/computer-act.ts`, and `packages/cli-host/src/tool/computer-wait-for.ts` are thin tool adapters over those packages.
- Computer-use tools request user approval through `ctx.ask` with stable permission keys such as `computer.observe`, `computer.click`, `computer.type`, `computer.key`, and `computer.scroll`. Non-overridable policy denials happen before permission prompts.

## Runtime Flow

`computer.observe` follows this order:

1. Check native helper availability.
2. Ask the driver for an observation.
3. Enforce app policy on the observed app.
4. Enforce requested target app/window identity before returning observation data.
5. Request `computer.observe` approval through `ctx.ask`.
6. Apply requested minimization such as `includeScreenshot=false`, `includeAXTree=false`, and `maxNodeCount`.
7. Decide model attachment policy for screenshots and AX summaries.
8. Request `computer.model_attachment` approval when screenshot attachment requires confirmation.
9. Store screenshot artifacts in the session coordinator only after attachment policy and approval permit them.
10. Emit metadata-only audit events.
11. Return redacted observation data plus compact AX summary, attachment, and permission-prompt metadata.

`computer.act` follows this order:

1. Check native helper availability.
2. Classify action risk and deny blocked actions.
3. Enforce app policy on the requested app.
4. Apply host rate limiting.
5. Request action-specific approval through `ctx.ask`.
6. Serialize the action through the session coordinator.
7. Re-observe immediately before execution and verify foreground app/window invariants.
8. Detect blocking modal/dialog state before execution.
9. Resolve semantic actions against the fresh observation when needed.
10. Execute exactly one primitive driver action.
11. Emit metadata-only audit events.

Helper crash recovery uses bounded exponential backoff and disables restart on crash loops until a future supervisor explicitly resets state. When a helper crash is detected, host cleanup revokes pending computer-use approvals, deletes active artifacts, and marks known sessions cancelled with the crash reason.

Helper RPC uses newline-framed request/response envelopes for `health`, `status`, `observe`, `act`, `cancel`, and `shutdown`. The host rejects unmatched response IDs, helper-reported errors, malformed status, malformed observations, malformed action results, and non-boolean control responses before passing data to tool policy.

`computer.waitFor` follows this order:

1. Check native helper availability.
2. Validate that at least one element condition is present.
3. Poll bounded repeated observations.
4. Enforce app policy on each observation.
5. Enforce requested target app/window identity on each observation.
6. Request `computer.observe` approval through `ctx.ask` after policy and target checks pass.
7. Return once an element id, label, or text condition matches.
8. Emit metadata-only audit events.

## Native Helper Boundary

The macOS helper is a separate process. It must negotiate protocol major version, report typed OS permission state, and pass helper authenticity checks before the host uses it. Release helpers must be signed and notarized; arbitrary helper paths require an explicit development override.

Helper readiness fails closed when required OS permissions are missing or unknown. Accessibility is required for observe/action readiness; Screen Recording is additionally required when an observe request needs screenshot capture.

The helper must never return raw screenshots as model output. Screenshots are represented as daemon-owned artifact handles with retention and quota controls. Host artifact reads are session-bound, no-store responses and reject missing, expired, deleted, cross-session, or byte-unavailable artifacts.

## Safety Invariants

- Computer-use tools are enabled by default.
- Native OS automation is unavailable unless a verified helper is available.
- Non-mock desktop automation requests return explicit `platformUnsupported`, `desktopSessionUnavailable`, `helper_not_found`, or helper authenticity/readiness reasons rather than silently falling back to mock behavior.
- Built-in and user app denylists are non-overridable.
- Observed app text is untrusted and must not be treated as instructions.
- Logs and permission metadata record decisions, reasons, and identifiers, not raw screenshots, AX dumps, or typed secrets.
- Action tools perform at most one action per call.
- Actions must revalidate foreground state immediately before execution.
- Model attachment policy defaults to denying remote screenshot attachment.
