# Computer-Use Completion Audit

This audit maps the implementation in the `computer-use-foundation` worktree to `~/Desktop/interbase-computer-use-plan.md`.

## Verified Locally

- Worktree exists at `/Users/rk/Developer/agentsorchestrationcompany/interbase-computer-use` on branch `computer-use-foundation`.
- `packages/computer-use-protocol` implements protocol types including validated app signing metadata, capabilities, runtime action validation, size-limited IPC envelopes, a separate 512 KiB AX payload cap, permissions, Phase A action primitives including `movePointer`, Phase B semantic actions (`clickElement`, `setElementValue`, `focusElement`, `focusWindow`, `selectMenuItem`, `openContextMenu`), locally testable Phase C primitives/surface (`drag`, `focusApp`, `launchApp`, `fileDialog`), coordinate pointer guardrails requiring both window context and explicit coordinate space, artifact reads, and helper contract surface.
- `packages/computer-use-policy` implements app policy, denylist, redaction including raw prompt-injection text redaction, risk, blocked app-switch/paste shortcuts, rate limiting, model attachment, prompt-injection classification, and desktop availability decisions.
- `packages/computer-use-testkit` implements mock observations, sanitized traces/replay with raw observation/action/prompt-injection payload rejection, backend fixtures, and helper RPC contract fixtures.
- `packages/cli-host/src/computer-use` owns host audit sanitization, metadata-only policy/approval/driver status/driver crash/artifact events with host protocol version metadata and plan-aligned approval reply values, approvals, artifacts, session coordination, screenshot observation serialization, abort-driven observe/wait/action cancellation, helper discovery/authenticity/launch/transport/supervision, native-helper driver wiring, permission prompts with once/session/always/deny computer-use options, modal detection, and persistence adapters.
- Built-in tools `computer.observe`, `computer.act`, and `computer.waitFor` are registered through `ToolRegistry`, deny by default, enforce policy before permission prompts, and use mock or verified native helper drivers. `computer.act` validates driver status immediately before its pre-action observation and action execution, and denies actions when the target window is known hidden.
- The public repo owns the helper protocol, host driver seam, manifest validation, and contract tests; native helper implementation and release packaging live behind the private helper artifact boundary.
- Screenshot bytes are persisted internally by the helper in owner-only artifact directories/files with startup cleanup for expired helper artifact files, exposed to the host through `artifact` RPC, and hydrated into session-bound no-store artifact reads with configurable per-artifact, per-session, and global byte quotas, fail-closed oversized screenshot handling, helper-crash cleanup, and no raw paths or inline model bytes.
- SQLite migration `20260603094045_computer_use_persistence` adds `computer_use_artifact` and `computer_use_audit` tables for metadata-only persistence.
- `packages/cli-host/script/computer-use-helper-manifest.ts` provides a release manifest gate that refuses unsigned/incomplete helper evidence.
- Docs cover architecture, backend capabilities, config, troubleshooting, threat model, native helper identity, macOS helper identity, and manual macOS permission validation.

## Verification Evidence

- `bun run validate` passed in the worktree after the computer-use changes.
- `swift test --enable-code-coverage` for the helper passed with 100% regions/functions/lines for helper source files.
- `swift build -c release` for the helper passed.
- `bun test test/computer-use/*.test.ts --coverage --coverage-reporter=lcov && bun run test/computer-use/check-coverage.ts` passed with the scoped computer-use 100% gate.
- `bun run test && bun run typecheck && bun run build` passed in `packages/computer-use-protocol`.
- `bun run test && bun run typecheck && bun run build` passed in `packages/computer-use-policy`.
- `bun run test && bun run typecheck && bun run build` passed in `packages/computer-use-testkit`.
- `bun test test/storage/json-migration.test.ts --timeout 30000` passed with the computer-use persistence migration present.
- `bun run computer-use:helper-manifest -- --helper /tmp/missing-helper.app` failed closed with missing helper metadata, proving the command does not fabricate release manifests.

## External Evidence Still Required

These items require Apple signing credentials and/or a clean macOS TCC environment and cannot be completed by local unit tests alone.

- Signed helper `.app` with hardened runtime and Developer ID identity.
- Successful notarization and stapled ticket for release helper builds.
- `codesign --verify --deep --strict --verbose=2 <helper.app>` output from the release helper.
- `codesign -dv --verbose=4 <helper.app>` output showing the expected TeamIdentifier.
- `spctl --assess --type execute --verbose <helper.app>` output for the release helper.
- Clean-machine TCC matrix results from `docs/computer-use-macos-permissions.md`.
- Homebrew and npm wrapper install identity checks for helper path/signature/TCC behavior.

## Completion Status

The implementation and all locally verifiable coverage/validation gates are complete. Production native enablement remains externally blocked until the signing, notarization, and clean-machine macOS permission evidence above is collected.
