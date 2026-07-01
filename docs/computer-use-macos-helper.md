# Computer-Use macOS Helper Identity Prototype

This document captures the identity strategy for the macOS computer-use helper. The native helper exists as an unsigned development prototype; this document defines the checks required before it may be enabled for production use.

## Packaging Decision

- The helper is a separate process, not a linked library.
- Release builds must use hardened runtime, Developer ID signing, notarization, stapling, Gatekeeper assessment, and a generated pinned helper manifest.
- The helper protocol major version is tied to the TypeScript host protocol major version.
- The helper path is supplied by private release configuration or `INTERBASE_COMPUTER_USE_HELPER_PATH`; it is not part of the public protocol boundary.
- App bundle helpers launch through LaunchServices so macOS TCC permissions attach to the signed `.app` identity; direct helper binaries launch directly with `--stdio`.
- Double-clicking the helper app, or launching it with `--status-menu`, opens the menu bar status app. The menu shows Accessibility and Screen Recording state, opens the permission guides, and can restart stale CLI helper processes after TCC changes.

## Authenticity Checks

The host must verify all available manifest fields before launch:

- Expected helper path.
- Expected protocol major.
- Minimum helper version and exclusive maximum helper version.
- Packaged checksum when available.
- macOS signature validity when available.
- Expected Developer Team ID for release builds.
- Expected bundle ID for app/helper-bundle packaging.

Arbitrary helper paths are refused unless `INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER=1` is set for local development. That override must produce an audit warning and must not be enabled by default.

The host builds a launch command only after the helper path exists and candidate metadata passes authenticity checks. Bundle discovery reads `Contents/Info.plist`, verifies the executable path, computes the executable checksum, reads `InterbaseComputerUseProtocolMajor`, and carries `INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR` in the launch environment so helper and host failures are diagnosable before any observe/action request. When `computer_use.enabled=true`, the tools ask the default native helper factory for a verified helper driver and return concrete helper availability reasons such as `helper_not_found` or `signature_invalid` instead of falling back to mock behavior.

Release operators can generate a pinned helper manifest with `bun run computer-use:helper-manifest -- --helper <helper.app> --out <manifest.json>` from the repository root. The same script is also available from `packages/cli-host`; when using the package script, pass an absolute helper path or a path relative to `packages/cli-host`. The command refuses to write a release manifest unless checksum, valid signature status, TeamIdentifier, and bundle ID evidence are all available.

## Release Signing And Notarization

Private release automation builds the `.app`, signs it with hardened runtime and timestamping, zips it with `ditto --keepParent`, submits it to Apple notarization, staples the ticket, runs Gatekeeper assessment, and writes a pinned manifest.

Signing input:

- `INTERBASE_COMPUTER_USE_CODESIGN_IDENTITY`.

Notarization input, choose one:

- `NOTARYTOOL_KEY_ID`, `NOTARYTOOL_ISSUER_ID`, and `NOTARYTOOL_KEY_PATH` for App Store Connect API key authentication.
- `INTERBASE_COMPUTER_USE_NOTARY_KEYCHAIN_PROFILE` for an `xcrun notarytool store-credentials` profile.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.

Optional release inputs:

- `INTERBASE_COMPUTER_USE_HELPER_VERSION`, default `0.1.0`.
- `INTERBASE_COMPUTER_USE_NOTARIZE_ARTIFACT_DIR`, default `.build/notarization` under the helper package.
- `INTERBASE_COMPUTER_USE_HELPER_MANIFEST_PATH`, default `<artifact-dir>/helper-manifest.json`.

Example:

```sh
INTERBASE_COMPUTER_USE_HELPER_PATH=/path/to/helper.app \
  bun run computer-use:helper-manifest -- --helper /path/to/helper.app --out /path/to/helper-manifest.json
```

The script must finish with successful `codesign --verify`, `xcrun stapler staple`, `spctl --assess --type execute --verbose`, and helper manifest generation before the helper can be treated as release-ready.

After launch, helper RPC is request/response only. Helper-initiated events are rejected. Each response must match an active request ID and pass the TypeScript host validators for health, status, observe, action, artifact, cancel, and shutdown results.

The TypeScript testkit exports helper contract fixtures for `health`, `status`, `observe`, `act`, `artifact`, `cancel`, and `shutdown`. A native Swift helper must round-trip equivalent newline-framed envelopes before it can be used for local observe smoke tests.

The private native helper implementation must support `--stdio`, `--status-menu`, and `--permission-guide accessibility|screenRecording`, report `health`/`status`, return protocol-compatible observations with typed `app`, optional `window`, optional screenshot `ArtifactHandle`, typed AX `elements`, warnings, and redaction metadata, handle primitive `act` requests for host-resolved `click`, `doubleClick`, `scroll`, `typeText`, and `keyChord` actions when Accessibility is granted, serve persisted screenshot bytes through the `artifact` RPC when Screen Recording is granted, and handle `cancel`/`shutdown` as control acknowledgements. Semantic actions still fail closed until the host resolves them to primitive targets. Screenshot capture must return model-facing handles with display geometry rather than inline bytes or raw filesystem paths, and the host hydrates session-bound artifact bytes through guarded no-store reads after attachment policy allows the handle.

## Manual Questions To Resolve Before Native Observe

Use `docs/computer-use-macos-permissions.md` as the release/TCC evidence checklist before enabling native helper behavior outside local development.

- Whether Accessibility permission attaches to the helper bundle, terminal, CLI binary, or parent app.
- Whether Screen Recording permission attaches to the helper bundle, terminal, CLI binary, or parent app.
- Whether Homebrew and npm wrapper installs produce different TCC identities.
- Whether a `.app` bundle is required for stable permission prompts.
- Whether a Bun single-file binary can launch the helper without invalidating signature or notarization assumptions.

## Permission Readiness Contract

The helper status endpoint reports `accessibility` and `screenRecording` as `granted`, `missing`, or `unknown`. The host refuses readiness when required permissions are `missing` or `unknown`. Observe without screenshots requires Accessibility; observe with screenshots also requires Screen Recording. Actions require Accessibility and are not retried silently after helper crashes.
