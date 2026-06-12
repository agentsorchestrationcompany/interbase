# Computer-Use Configuration

Computer-use tools are enabled by default. Native desktop automation still requires a verified helper and the relevant macOS permissions.

## Config Shape

```jsonc
{
  "computer_use": {
    "app_denylist": [
      { "name": "Example App", "bundleId": "com.example.app", "path": "/Applications/Example.app" }
    ],
    "artifact_retention_ms": 300000,
    "model_attachment": {
      "allow_screenshots_to_remote_models": "never",
      "allow_ax_text_to_remote_models": "redacted_summary_only",
      "require_confirmation_for_screenshots": true
    }
  }
}
```

## Fields

- `enabled`: Reserved for a future preferences-pane toggle. It is currently ignored and computer-use remains enabled.
- `app_denylist`: Blocks matching apps before approval prompts. User denylist matches are non-overridable.
- `artifact_retention_ms`: Maximum lifetime for computer-use artifacts such as screenshots.
- `model_attachment.allow_screenshots_to_remote_models`: `never`, `confirm`, or `always`. The safe default is `never`.
- `model_attachment.allow_ax_text_to_remote_models`: `none` or `redacted_summary_only`.
- `model_attachment.require_confirmation_for_screenshots`: Requires a separate `computer.model_attachment` approval before screenshot attachment.

## Permission Keys

- `computer.observe`: Observe app/window state, redacted AX summaries, and permitted screenshot handles.
- `computer.click`: Click-like actions.
- `computer.type`: Text entry actions.
- `computer.key`: Key chord actions.
- `computer.scroll`: Scroll actions.
- `computer.action`: Generic action fallback for policy and prompt metadata.
- `computer.model_attachment`: Approval for model attachment of screenshot or AX-derived data when policy requires confirmation.

## Native Development Override

Local development may use an unsigned helper only when `INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER=1` is set. Release and production use must provide a signed, notarized helper manifest as described in `docs/computer-use-macos-helper.md`.
