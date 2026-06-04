# Interbase CLI Package

This package contains the Interbase CLI host workspace with OpenCode-derived source and Interbase-owned host adapters.

Install dependencies from the repository root:

```bash
bun install --frozen-lockfile
```

Run local validation from the repository root:

```bash
bun run validate
```

Build the current-platform binary without embedding a web UI:

```bash
npm --workspace @interbase/cli-host run build -- --single --skip-embed-web-ui
```

Publication is operator-owned. Agents and automation may run `npm pack --dry-run` and local build smoke tests, but must not publish packages or releases.
