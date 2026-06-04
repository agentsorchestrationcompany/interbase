# Telemetry

## Opt Out

Interbase CLI analytics are enabled by default. You can disable them globally:

```bash
interbase analytics off
```

You can re-enable them globally:

```bash
interbase analytics on
```

You can inspect the current setting:

```bash
interbase analytics status
```

You can also disable telemetry for a single process by setting either environment variable:

```bash
INTERBASE_TELEMETRY_DISABLED=1
DO_NOT_TRACK=1
```

Environment opt-outs take precedence over the persisted global preference. When telemetry is disabled, Interbase does not resolve hardware identity, generate an installation identity, or call the analytics API.

## Privacy

Interbase does not collect prompts, prompt alias names, prompt alias expansions, file paths, repo names, worktree names, hostnames, usernames, emails, auth tokens, raw device IDs, Project IDs, task IDs, session IDs, or goal objectives in CLI analytics events.

For anonymous usage, Interbase uses a hashed hardware-derived device identifier where available, with a generated installation fallback when hardware identity is unavailable. Raw hardware identifiers and generated installation IDs are not sent.

## Captured Events And Properties

```text
+--------------------------------+--------------------------------------------------------------+
| Captured                       | Explanation                                                  |
+--------------------------------+--------------------------------------------------------------+
| anonymousIdentity.digest       | 64-character hash used for anonymous analytics identity.     |
| anonymousIdentity.source       | Whether identity came from hardware or generated install ID.  |
| event                          | Enum event name for the behavior being counted.              |
| properties.cliEntrypoint       | Startup surface: tui, server, or command.                    |
| properties.goalDurationSeconds | Aggregate elapsed seconds for goal lifecycle events.         |
| properties.goalStatus          | Goal lifecycle status such as active, complete, or blocked.  |
| properties.goalTokenBudget     | Aggregate token budget for goal lifecycle events, if set.    |
| properties.goalTokensUsed      | Aggregate token usage count for goal lifecycle events.       |
| properties.reviewTargetType    | Review target category: branch, uncommitted, or sha.         |
| version                        | Telemetry request contract version.                          |
+--------------------------------+--------------------------------------------------------------+
```

## Event Names

```text
+-----------------------------+--------------------------------------------------------------+
| Event                       | Explanation                                                  |
+-----------------------------+--------------------------------------------------------------+
| alias_created               | A prompt alias was created. Alias name and prompt are absent. |
| alias_deleted               | A prompt alias was deleted. Alias name is absent.            |
| alias_expanded              | A prompt alias was expanded before submission. Text absent.  |
| analytics_disabled          | CLI analytics were disabled.                                 |
| analytics_enabled           | CLI analytics were enabled.                                  |
| analytics_status_viewed     | CLI analytics status was viewed.                             |
| doctor_run                  | The doctor command was run.                                  |
| goal_blocked                | A goal was marked blocked.                                   |
| goal_budget_limited         | A goal reached its configured token budget.                  |
| goal_cleared                | A goal was cleared.                                          |
| goal_continuation_started   | A goal continuation prompt was emitted.                      |
| goal_completed              | A goal was marked complete.                                  |
| goal_created                | A goal was created. Objective is absent.                     |
| goal_edited                 | A goal objective was edited. Objective is absent.            |
| goal_paused                 | A goal was paused.                                           |
| goal_replaced               | An existing goal was replaced. Objective is absent.          |
| goal_replacement_cancelled  | A pending goal replacement was cancelled.                    |
| goal_resume_prompt_shown    | A resume prompt was shown for a paused/limited goal.         |
| goal_resumed                | A paused, blocked, or limited goal was resumed.              |
| goal_usage_limited          | A goal reached its maximum usage threshold.                  |
| model_picker_opened         | The model picker was opened.                                 |
| model_selected              | The active session model was changed. Model ID is absent.    |
| prompt_submitted            | A prompt was submitted. Prompt text is absent.               |
| provider_auth_completed     | Provider authentication completed successfully. Tokens absent.|
| provider_auth_failed        | Provider authentication failed. Error details are absent.    |
| provider_auth_started       | Provider authentication started. Provider ID is absent.      |
| remote_runtime_connected    | A remote runtime connected.                                  |
| review_requested            | The review command was requested. Arguments are absent.      |
| session_compacted           | Session compaction was requested.                            |
| session_created             | A session was created. Session ID is absent.                 |
| session_error               | A session-level error occurred. Error details are absent.    |
| session_exported            | Session export completed. Session ID and contents are absent.|
| session_forked              | A session was forked. Session IDs are absent.                |
| session_imported            | Session import completed. Source path and contents absent.   |
| session_interrupted         | Session interruption was requested.                          |
| session_new_requested       | A new session was requested.                                 |
| session_picker_opened       | The session picker was opened.                               |
| session_resumed             | An existing session was selected for use. Session ID absent. |
| started                     | The CLI started.                                             |
| theme_changed               | The active TUI theme was changed. Theme name is absent.      |
| theme_picker_opened         | The theme picker was opened.                                 |
| tool_called                 | A tool call started. Tool name, args, and output are absent. |
| upgrade_completed           | CLI upgrade completed. Version and method are absent.        |
| upgrade_started             | CLI upgrade started. Version and method are absent.          |
+-----------------------------+--------------------------------------------------------------+
```
