# Contributing to Interbase

Thanks for contributing.

## Before You Start

- Use GitHub issues for bugs, feature requests, and discussion when possible.
- For security reports, follow `SECURITY.md` instead of opening a public issue.
- Keep pull requests focused and small enough to review.

## Development Setup

Install dependencies from the repository root:

```bash
bun install --frozen-lockfile
```

## Local Validation

Run the full repository validation suite before opening a pull request:

```bash
bun run validate
```

Common focused commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build:cli
```

## Pull Request Expectations

- Add or update tests when behavior changes.
- Update public docs when install, usage, or release behavior changes.
- Do not commit secrets, credentials, or private infrastructure details.
- Preserve legal attribution and provenance files where required.
- Do not publish packages or releases from contributor pull requests.

## Repository Structure

This repository contains OpenCode-derived source plus Interbase-owned packages
and extensions.

When contributing:

- keep Interbase-owned behavior in Interbase-owned packages
- avoid reintroducing product logic into vendored or compatibility seams
- preserve upstream attribution where legal and provenance files require it

## Review Process

Maintainers may request changes for correctness, scope, test coverage,
documentation, release safety, or boundary enforcement.

By participating in this project, you agree to follow `CODE_OF_CONDUCT.md`.
