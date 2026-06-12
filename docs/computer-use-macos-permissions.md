# Computer-Use macOS Permission Validation

Computer-use native mode is not production-ready until a signed and notarized helper passes these manual checks on a clean macOS machine.

## Required Evidence

- Signed `.app` bundle path and SHA-256 checksum.
- `codesign --verify --deep --strict --verbose=2 <helper.app>` succeeds.
- `codesign -dv --verbose=4 <helper.app>` shows the expected TeamIdentifier.
- `xcrun stapler validate <helper.app>` succeeds for release builds.
- `spctl --assess --type execute --verbose <helper.app>` succeeds for release builds.
- Notarization ticket is stapled for release builds.
- `bun run computer-use:helper-manifest -- --helper <helper.app> --out <manifest.json>` succeeds from the repository root.
- `computer_use.enabled=true` launches only the verified native helper path.
- Helper `health` reports protocol major `0`, bundle ID `ai.interbase.computer-use-helper`, and capabilities including `status`, `observe`, `act`, `screenshot`, `artifact`, and `axTree`.

## TCC Matrix

- No Accessibility, no Screen Recording: `status` reports both missing; observe/action fail closed.
- Accessibility only: observe without screenshot can run; observe with screenshot fails closed; actions can run only after app/action approval.
- Screen Recording only: observe/action fail closed because Accessibility is missing.
- Accessibility and Screen Recording: observe can return app/window/AX/screenshot handle; artifact RPC can return bytes for that handle.
- Revoke Accessibility while helper is running: next action fails closed and is not silently retried.
- Revoke Screen Recording while helper is running: next screenshot observe/artifact read fails closed.

## Privacy Checks

- Model output contains screenshot handles, not raw bytes or filesystem paths.
- SQLite `computer_use_audit` rows contain sanitized metadata only.
- SQLite `computer_use_artifact` rows contain handles and metadata only, not PNG bytes.
- Session revocation and helper crash cleanup mark active artifacts deleted.
- Expired artifacts are marked deleted during cleanup.

## Install Identity Checks

- Direct local dev helper with `INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER=1` produces an explicit warning.
- Direct local dev helper without the override is refused.
- npm wrapper install preserves helper path/signature assumptions.
- Homebrew install preserves helper path/signature assumptions.
- Quarantined download either passes notarized assessment or is refused with an actionable helper availability reason.
