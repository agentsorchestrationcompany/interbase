# Repository Guide

## Git

- Mandatory: agents must NEVER commit work automatically; only commit when explicitly asked by the user.

## CI Validation

- Before handing work back, validate changes against the same checks used by CI whenever feasible.
- The primary CI-equivalent command is `bun run validate` after dependencies are installed with `bun install --frozen-lockfile`.
- For changes touching packaging, plugin mode, isolated checkout behavior, or release preparation, also run the matching CI job command: `npm pack --dry-run --json` in `packages/cli`, `bun run test:pure-plugin-mode`, `bun run check:isolated-public-checkout`, or `bun run release:cli:prepare -- --version 0.0.1` followed by `bun run release:cli:verify`.
- If a required CI-equivalent check cannot be run locally, state exactly which check was skipped and why.
