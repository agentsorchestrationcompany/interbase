# Computer-Use Troubleshooting

## Tool Is Disabled

`computer.observe`, `computer.act`, and `computer.waitFor` are disabled unless `computer_use.enabled=true` or the experimental feature flag is set. Runtime computer-use uses the native backend only; mock drivers are injected by tests and are not configurable in user/runtime config.

## Native Helper Unavailable

Native mode fails closed when the helper cannot be discovered, authenticated, launched, or validated. Common reasons include `platformUnsupported`, `desktopSessionUnavailable`, `helper_not_found`, `signature_invalid`, protocol mismatch, missing permissions, or a failed `health` handshake.

## Unsigned Development Helper Refused

Unsigned or incomplete helper candidates are refused unless `INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER=1` is set. This override is for local development only and must not be used for release validation.

## Missing macOS Permissions

Accessibility is required for observe and action readiness. Screen Recording is additionally required when screenshot capture or artifact byte retrieval is requested. If either permission is `missing` or `unknown`, the host returns an explicit readiness failure instead of continuing.

## Actions Are Denied

Actions can be denied by feature gating, app denylist, target app/window mismatch, blocked risk, rate limit, modal detection, stale semantic targets, cancellation, revocation, helper crash, or missing Accessibility permission. Actions are serialized and are not silently retried after helper crashes.

## Screenshots Are Missing

Screenshots are represented as artifact handles, not inline bytes or filesystem paths. Artifact reads are session-bound and fail when the handle is missing, expired, deleted, cross-session, or byte-unavailable. Remote model attachment follows `computer_use.model_attachment` policy and may require separate confirmation.

## Release Validation

Before enabling native mode outside local development, collect the signing, notarization, `spctl`, and clean-machine TCC evidence listed in `docs/computer-use-macos-permissions.md`.
