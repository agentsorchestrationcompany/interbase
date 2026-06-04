<img alt="Interbase ASCII splash" src="./assets/interbase-ascii-splash-light-loop-hq.gif#gh-light-mode-only" style="pointer-events: none;"><img alt="Interbase ASCII splash" src="./assets/interbase-ascii-splash-dark-loop-hq.gif#gh-dark-mode-only" style="pointer-events: none;">

<p align="center"><a href="https://discord.gg/yPD3Yztw6"><img alt="Discord" src="https://img.shields.io/discord/1508128262209929398?style=plastic"></a>&nbsp;<a href="https://x.com/interbaseai"><img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/interbaseai?style=plastic&color=green"></a></p>

Interbase is an open-source CLI agent for serious work on your computer. It gives you broad model choice, reusable prompt aliases, long-running goals, and secure remote access from trusted devices.

To get started, simply run this preferred command:

```bash
brew install agentsorchestrationcompany/homebrew-tap/interbase
```

Or any of these alternative commands:

```bash
npm install -g interbase
bun install -g interbase
```

## Providers, Models, and Variants

Interbase is built to help you work with the best model for the job instead of locking you into one stack. Connect a provider with `/provider`, switch models with `/models`, and when a model supports different reasoning or speed profiles, fine-tune it with `/variants`.

Out of the box, Interbase ships with support for 135 providers and more than 4,800 cataloged models. That includes frontier labs, cloud platforms, gateways, enterprise routers, coding-focused services, and local or self-hosted options.

## Remote

Remote lets you keep using Interbase even when you are away from the machine running it.

With the official Interbase mobile app, you can check in on running work, send follow-up instructions, and guide the agent from another trusted device.

Remote is designed for privacy. Your instructions, responses, and session activity are encrypted between the devices you authorize, so your work stays private.

See [remote encryption code references](./docs/remote-encryption.md) for the implementation map.

## Interbase Slash Commands

Interbase builds on the OpenCode command surface with a small set of product-specific `/` commands:

```text
+----------+---------------------------------------------------+
| Command  | Description                                       |
+----------+---------------------------------------------------+
| /aliases | Save commonly used prompts as reusable shortcuts. |
| /goal    | Set, inspect, or continue a long-running goal.    |
+----------+---------------------------------------------------+
```

## Package Map

```text
packages/
|-- cli                             Published interbase CLI wrapper and install entrypoint.
|-- cli-host                        Main CLI application, TUI, local server, sessions, tools, providers, and storage.
|-- core                            Shared runtime utilities used by CLI packages.
|-- sdk/
|   `-- js                          TypeScript SDK and generated API client.
|-- plugin                          Public plugin types and helpers.
|-- script                          Shared repository scripts.
|-- runtime-protocol                Protocol types shared by runtime integrations.
|-- remote-runtime-adapters         Adapter layer for remote runtime integrations.
|-- remote-runtime-contracts        Remote runtime contracts and schema exports.
|-- remote-runtime-entitlements     Remote runtime entitlement checks.
|-- remote-runtime-host             Host-side remote runtime manager and local gateway.
|-- cli-agent-backends              Agent backend integrations for CLI-driven local and remote execution.
|-- cli-aliases-plugin              `/aliases` command plugin and alias persistence wiring.
|-- cli-compat                      Compatibility helpers for CLI behavior and parsing.
|-- cli-goal-plugin                 `/goal` command plugin, goal state, and TUI continuation queue.
|-- cli-keychain                    Keychain integration helpers for CLI credentials.
|-- cli-local-state                 Shared local state storage helpers for CLI feature packages.
|-- cli-model-switching             Model switching behavior and tests for CLI sessions.
|-- cli-overlay                     Interbase CLI overlay assets, manifest, and theme exports.
|-- cli-provider-catalog-plugin     Provider metadata catalog plugin.
|-- cli-runtime-context             Runtime context primitives shared across CLI packages.
|-- cli-session-turns               Session turn tracking utilities for CLI workflows.
|-- cli-telemetry                   CLI analytics opt-out state, anonymous identity, and telemetry request seam.
`-- cli-workspace-config            Workspace-scoped CLI configuration area.
```
