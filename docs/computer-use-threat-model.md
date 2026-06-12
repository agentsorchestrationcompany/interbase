# Computer-Use Threat Model

This document records the security boundary for the computer-use implementation. Runtime computer-use is native-only; mock drivers are injected by tests and are not available through user configuration.

## Protected Assets

- Screenshots and accessibility text from user applications.
- Credentials, secure text fields, 2FA codes, private messages, clipboard contents, and file dialog paths.
- App approval and denylist decisions.
- Host artifact paths and artifact handles.

## Threats

- Observed UI text can contain prompt injection that asks the model to ignore instructions, reveal secrets, disable safety, or approve actions.
- A model can attempt to bypass policy with tool arguments.
- A denied app can be visible in a screenshot background.
- A helper process can be replaced, downgraded, or impersonated in later native phases.
- IPC payloads can be malformed, oversized, or version-skewed.
- Logs can accidentally persist raw screenshots, AX trees, credentials, or injection text.

## First-PR Invariants

- Computer-use tools are enabled by default.
- `computer.observe` still requires the verified native helper and per-action policy/permission checks.
- Observation execution uses the verified native helper path; tests may inject mock drivers without exposing a runtime mock backend.
- Built-in and user app denylists are enforced before approvals.
- Screenshot handles are removed from model output unless model attachment policy explicitly allows them.
- Screenshot artifact handles that require confirmation are not created for model output until `computer.model_attachment` approval succeeds.
- Secure fields and sensitive text are redacted before model output.
- Observed text is always labeled as untrusted.
- Audit metadata excludes raw screenshots and raw AX tree dumps.
- IPC envelopes are newline-framed, versioned, size-limited, and rejected on malformed input.
- Observed UI text is classified for prompt-injection-like policy overrides, secret extraction, approval spoofing, and safety override language. Classification adds metadata warnings only; it does not grant permissions or execute app-provided instructions.

## Native-Phase Requirements

- Native helpers must be separate signed processes with protocol version negotiation.
- Release helpers must verify expected path, checksum when available, code signature, team ID, bundle ID, and driver version range before launch.
- Arbitrary helper paths must require an explicit development escape hatch.
- Clipboard reads remain unavailable by default.
- Action tools must re-check foreground app/window invariants immediately before execution.
