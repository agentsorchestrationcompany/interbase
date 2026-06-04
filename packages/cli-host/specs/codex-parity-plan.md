# Codex Compaction And Goal Lifecycle Parity Plan

## Parity Target

"100% parity" means matching official Codex behavior and lifecycle semantics, not porting Rust internals line-for-line.

Official Codex reference points:

- Pre-turn compaction: `~/Developer/codex/codex-rs/core/src/session/turn.rs:141-145`
- Mid-turn compaction: `~/Developer/codex/codex-rs/core/src/session/turn.rs:248-308`
- Token status and compaction scopes: `~/Developer/codex/codex-rs/core/src/session/turn.rs:640-710`
- Goal continuation lifecycle: `~/Developer/codex/codex-rs/core/src/goals.rs:1289-1378`
- Auto-compact default threshold: `~/Developer/codex/codex-rs/protocol/src/openai_models.rs:328-336`

Current goal-lifecycle parity state:

- `packages/cli-host/src/session/prompt.ts` now runs the pre-sampling compaction gate before asking plugins for idle continuation candidates.
- Goal lifecycle semantics for this pass are implemented in the plugin/host seam: `blocked`, `/goal edit`, objective-update steering, candidate-based hidden continuation turns, mid-turn budget steering, accounting hooks, and the JSON-vs-SQLite storage decision.

## Phase 1: Lock Behavioral Spec With Tests

Add failing tests before implementation so each Codex behavior has an executable parity check.

- `packages/cli-host/test/session/prompt.test.ts`: active goal idle continuation near threshold triggers compaction before any LLM call.
- `packages/cli-host/test/session/prompt.test.ts`: active goal idle continuation does not start when pending questions exist.
- `packages/cli-host/test/session/prompt.test.ts`: active goal idle continuation does not start when queued user input exists.
- `packages/cli-host/test/session/prompt.test.ts`: `/goal resume` uses the same continuation scheduling path as idle continuation.
- `packages/cli-host/test/session/prompt.test.ts`: tool-call follow-up near threshold compacts before the follow-up model call.
- `packages/cli-host/test/session/compaction.test.ts`: default auto-compact threshold is Codex-like `90%` of resolved context.
- `packages/cli-host/test/session/compaction.test.ts`: `Total` scope counts full active context.
- `packages/cli-host/test/session/compaction.test.ts`: `BodyAfterPrefix` scope counts only growth after the compacted/prefilled prefix.
- `packages/cli-goal-plugin/test/index.test.ts`: usage/budget accounting, pause/resume, completion, and budget-limit prompts continue matching expected goal behavior.

## Phase 2: Add Codex-Style Token Status Abstraction

Introduce a host-owned session token status layer.

Target behavior:

- Maintain active context token usage as session/runtime state.
- Compute whether auto-compaction is needed from session token status, not only the last assistant message.
- Support a resolved auto-compact limit defaulting to `90%` of model context.
- Support configured override for auto-compact limit.
- Support `Total` and `BodyAfterPrefix` scopes.
- Preserve a hard full-context safety guard even in `BodyAfterPrefix`.

Likely files:

- `packages/cli-host/src/session/overflow.ts`
- `packages/cli-host/src/session/session.ts`
- `packages/cli-host/src/session/session.sql.ts` if persistence is required
- `packages/cli-host/src/config/config.ts`

## Phase 3: Move Pre-Sampling Compaction Before Continuation Injection

This is the immediate fix for the current `/goal` stall class.

Target behavior:

- At the top of each loop iteration, after loading compacted history and identifying `lastUser`/`lastFinished`, run a pre-sampling compaction check.
- If the limit is reached, create or process compaction before asking plugins for `session.idle.continuation`.
- Only ask for goal continuation after compaction has either completed or been deemed unnecessary.
- Keep normal prompt, queued prompt, and command paths going through the same gate.

Primary file:

- `packages/cli-host/src/session/prompt.ts`

## Phase 4: Turn Goal Continuation Into A Normal Scheduled Turn

Codex starts idle goal continuation as a real turn, so it receives normal pre-turn lifecycle handling.

Target behavior:

- Replace "plugin returns text and host immediately persists it" with "plugin returns a continuation candidate."
- Host schedules that candidate only when idle and no pending questions or queued input exist.
- Host runs the pre-sampling compaction gate before persisting the synthetic continuation prompt.
- `/goal resume` and idle continuation share the same scheduler.
- Continuation prompt remains hidden/synthetic and wrapped in `<goal_context>`.

Likely files:

- `packages/cli-host/src/session/prompt.ts`
- `packages/cli-goal-plugin/src/index.ts`
- `packages/plugin/src/index.ts` if hook shape must change

## Phase 5: Add Mid-Turn Compaction Parity

Codex compacts between sampling requests when a follow-up is needed and the token limit has been reached.

Target behavior:

- After a model step finishes, determine whether the loop needs another model request.
- Follow-up reasons include tool calls, pending input, queued input, structured-output continuation, or provider follow-up.
- If follow-up is needed and token status is over the limit, compact before the next model request.
- After mid-turn compaction, continue the model/tool loop before draining unrelated user steering, matching Codex's "resume before steer" behavior.

Likely files:

- `packages/cli-host/src/session/prompt.ts`
- `packages/cli-host/src/session/processor.ts`
- `packages/cli-host/src/session/compaction.ts`

## Phase 6: Add Compaction Phase Semantics

Codex distinguishes manual, pre-turn, and mid-turn compaction.

Target behavior:

- Represent compaction phase: `manual`, `preTurn`, `midTurn`.
- Represent compaction reason: `contextLimit`, `modelDownshift`, `userRequested`, `overflow`.
- For pre-turn/manual compaction, allow the next normal turn to rebuild initial/system context.
- For mid-turn compaction, preserve enough current-turn context to continue the tool/model loop safely.
- Emit phase/reason in logs/events where useful.

Likely files:

- `packages/cli-host/src/session/compaction.ts`
- `packages/remote-runtime-contracts/src/remote-runtime-protocol.ts` only if remote runtime event shape needs phase/reason
- `packages/sdk/js/src/**` only if public schema changes are made

## Phase 7: Align Compaction Replacement Behavior

This is the most invasive parity piece.

Target behavior:

- Auto-compaction should replace history with a summary plus bounded recent user-visible context.
- Completed prior compaction summaries should anchor future summaries.
- Large media should be stripped or represented safely on overflow.
- Tool output pruning remains allowed, but should not be the primary parity mechanism.
- Existing `tail_start_id` behavior can remain internally if it produces Codex-equivalent active context.

Primary files:

- `packages/cli-host/src/session/compaction.ts`
- `packages/cli-host/src/session/message-v2.ts`

Current audit evidence:

- `packages/cli-host/test/session/compaction.test.ts` covers retained-tail sizing, oversized-tail fallback, media fallback, split-turn suffix retention, previous-summary anchoring for repeated compactions, head-only summary input, and preserving recent pre-compaction turns.
- `packages/cli-host/test/session/messages-pagination.test.ts` covers `tail_start_id` replacement boundaries, fork remapping, assistant-tail retention, and latest-boundary behavior for repeated compactions.
- Local compaction remains the replacement mechanism; tool-output pruning is tested separately and is not relied on as the primary active-context replacement path.

## Phase 8: Handle Usage Limits Like Codex

Codex usage-limit failures terminally affect active goals and prevent more idle continuation.

Target behavior:

- Detect provider usage-limit errors distinctly from ordinary stream failures.
- Account active goal progress before changing status.
- Mark active goal usage-limited or equivalent.
- Suppress subsequent idle continuations for usage-limited goals.
- Keep budget-limited status separate from provider usage-limit status.

Likely files:

- `packages/cli-host/src/session/processor.ts`
- `packages/cli-host/src/session/prompt.ts`
- `packages/cli-goal-plugin/src/index.ts`
- `packages/runtime-protocol/src/goal.ts` if adding a new public status

## Phase 8.5: Goal Storage Decision

Official Codex stores goals in SQLite (`thread_goals`) for transactional updates and exact multi-process durability.

Current Interbase state:

- Goal state is host-owned and persisted in the main CLI database through `thread_goal`.
- `JsonFileGoalStore` remains available only for standalone plugin tests and explicit injection.
- Goal mutations are centralized in `ThreadGoalManager`, with the production store injected from host core.

Decision:

- Use SQLite as the default plugin store for Codex storage parity and safer concurrent/durable updates.
- Do not add host-core SQLite tables for Interbase goal behavior; exact storage parity lives inside `packages/cli-goal-plugin` behind the existing `GoalStore` interface.
- Keep JSON as legacy import/fallback rather than the default authority.

Parity target:

- SQLite is the default authority for plugin-created goals.
- JSON remains acceptable only for explicit injection/tests or legacy import.
- Host integration remains a thin lifecycle adapter and must not become the goal state authority.

## Phase 8.6: Goal Accounting Lifecycle Audit

Official Codex lifecycle reference: `~/Developer/codex/codex-rs/core/src/goals.rs:347-418`.

Current Interbase mapping:

- Codex `TurnStarted` maps to `session.next.step.started`, handled by `ThreadGoalManager.handleRuntimeEvent` to capture `stepStarts` and `stepGoalIds`.
- Codex `ToolCompleted` maps to the plugin `tool.execute.after` hook, handled by `ThreadGoalManager.accountToolCompleted` to account elapsed in-flight work before any mid-turn steering check.
- Codex `ToolCompletedGoal` maps to `update_goal` execution plus the `tool.execute.after` skip for `update_goal`; `updateGoalComplete` and `updateGoalBlocked` account elapsed work before changing status, while final step tokens are still applied at `session.next.step.ended`.
- Codex `TurnFinished` maps to `session.next.step.ended`, handled by `accountTrackedStepUsage` with the original `goal_id` so edits/replacements do not misattribute tokens to a new goal.
- Codex `TaskAborted` maps to `session.cancel`, handled by `pauseForInterrupt`, which accounts elapsed work before pausing.
- Codex `UsageLimitReached` maps to `session.next.step.failed` or `session.error` with `usageLimited: true`, handled by `markUsageLimited`, which accounts elapsed work and suppresses future continuations.
- Codex `ExternalMutationStarting` maps to command/tool-driven state changes (`pause`, `resume`, `edit`, `complete`, `blocked`) accounting in-flight elapsed work before mutation.
- Codex `MaybeContinueIfIdle` maps to host-scheduled `session.idle.continuation` candidates, gated by pending questions, queued user input, and pre-turn compaction.
- Codex `ThreadResumed` maps to `/goal resume`, which returns an idle-continuation request rather than prompt text so the host schedules a normal hidden turn.

Audit result:

- Goal storage now uses plugin-owned SQLite by default per Phase 8.5.
- No vendored OpenCode file owns Interbase goal behavior; host changes are lifecycle adapter seams.

## Phase 9: Model Downshift Compaction

Codex compacts before switching to a smaller-context model when prior context would not fit.

Target behavior:

- Track previous turn model/context window.
- On model change, compare active context against the new model's resolved threshold/window.
- If downshifting and over limit, compact using the previous model/context before the new request.
- Ensure model-switch system reminders are not included in the compaction prompt but are restored for the next regular turn if needed.

Likely files:

- `packages/cli-host/src/session/prompt.ts`
- `packages/cli-host/src/session/session.ts`
- `packages/cli-model-switching` if model-switching plugin owns some state

Current audit evidence:

- `packages/cli-host/src/session/prompt.ts` compares active token status against the requested model and the previous finished assistant model before sampling.
- When the requested model overflows but the previous model fits, the host creates a `preTurn` compaction with reason `modelDownshift`, uses the previous model for summary generation, and replays the new smaller-model user turn after compaction.
- `packages/cli-host/test/session/prompt.test.ts` covers downshift compaction before sampling, verifies the compaction prompt excludes the smaller-model user request, and verifies the replayed turn samples on the smaller model.

## Phase 10: Remote Compaction Decision

Official Codex can delegate compaction to provider-side remote compaction when supported.

Current Interbase state:

- `packages/runtime-protocol/src/provider.ts:827-831` marks `thread.compact` unsupported.

Decision for this parity pass:

- Behavioral parity is provided by host-owned local compaction.
- No current provider contract advertises or implements remote thread compaction.
- Keep `thread.compact` unsupported until a concrete provider exposes a remote compaction API; when that happens, add a provider capability and continue to keep local compaction as fallback.

Parity target:

- If no provider supports remote compact, document "behavioral parity via local compaction."
- If provider remote compact becomes required, add a provider capability and keep local compaction as fallback.
- Do not block current parity work on remote compaction unless we have a concrete provider needing it.

## Recommended Milestones

### Milestone A: Stop The Stall

- Add tests for idle goal continuation near threshold.
- Move pre-sampling compaction before idle continuation injection.
- Keep current overflow implementation otherwise unchanged.
- Verify prompt/goal tests.

### Milestone B: Token Accounting Parity

- Add token status abstraction.
- Implement `90%` default threshold.
- Add `Total` and `BodyAfterPrefix`.
- Fix current `limit.input` headroom bug documented in `compaction.test.ts`.

### Milestone C: Lifecycle Parity

- Refactor goal continuation into a scheduled normal turn.
- Unify `/goal resume` and idle continuation scheduling.
- Add usage-limit suppression.
- Add pending input/queued input parity tests.

### Milestone D: Mid-Turn Parity

- Add follow-up detection before repeated model calls.
- Compact between tool-call steps when needed.
- Preserve current-turn continuity after compaction.
- Add tool-call follow-up tests.

### Milestone E: Replacement Semantics

- Align compaction replacement history.
- Validate summary anchoring and retained context.
- Keep or adapt `tail_start_id` only if active context matches Codex behavior.

## Validation Commands

- `bun test --preload ./packages/cli-host/test/preload.ts --timeout 30000 packages/cli-host/test/session/compaction.test.ts`
- `bun test --preload ./packages/cli-host/test/preload.ts --timeout 30000 packages/cli-host/test/session/prompt.test.ts`
- `bun run --cwd packages/cli-goal-plugin test`
- `bun run --cwd packages/cli-host typecheck`
- `bun run --cwd packages/cli-goal-plugin typecheck`
- `bun run typecheck`
- `bun run --cwd packages/cli-host test`
- `bun run validate`

Validation status for this parity pass:

- Focused prompt, goal-plugin, and runtime protocol tests pass.
- `bun run --cwd packages/cli-goal-plugin typecheck` passes.
- `bun run --cwd packages/cli-host typecheck` currently fails on unrelated `packages/remote-runtime-host/src/index.ts` `attachmentRequest` errors outside this parity surface.
- Earlier broad-suite notes in this file may include failures outside this parity surface; use focused goal/protocol/prompt checks as the authoritative verification for this pass.
- The root-level focused forms without `--preload ./packages/cli-host/test/preload.ts` are intentionally not used because cli-host tests fail fast without `INTERBASE_TEST_SANDBOX_ROOT`; the package test harness/preload is the authoritative isolated test setup.

## Open Decision

- Decision: make Codex parity the default behavior immediately. Do not add a temporary `experimental.codex_compaction_parity` flag unless a release-blocking compatibility issue appears.
