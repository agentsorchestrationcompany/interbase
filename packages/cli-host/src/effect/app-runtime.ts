import { Layer, ManagedRuntime } from "effect"
import { attach } from "./run-service"
import * as Observability from "@interbase/core/effect/observability"

import { AppFileSystem } from "@interbase/core/filesystem"
import { Bus } from "@/bus"
import { Auth } from "@/auth"
import { Account, createAccountLayer } from "@/account/account"
import { Config } from "@/config/config"
import { Git } from "@/git"
import { Ripgrep } from "@/file/ripgrep"
import { File } from "@/file"
import { FileWatcher } from "@/file/watcher"
import { Storage } from "@/storage/storage"
import { Snapshot } from "@/snapshot"
import { Plugin } from "@/plugin"
import { ModelsDev } from "@/provider/models"
import { Provider } from "@/provider/provider"
import { ProviderAuth } from "@/provider/auth"
import { Agent } from "@/agent/agent"
import { Skill } from "@/skill"
import { Discovery } from "@/skill/discovery"
import { Question } from "@/question"
import { Permission } from "@/permission"
import { Todo } from "@/session/todo"
import { Session } from "@/session/session"
import { SessionStatus } from "@/session/status"
import { SessionRunState } from "@/session/run-state"
import { SessionProcessor } from "@/session/processor"
import { SessionCompaction } from "@/session/compaction"
import { SessionRevert } from "@/session/revert"
import { SessionSummary } from "@/session/summary"
import { SessionPrompt } from "@/session/prompt"
import { Instruction } from "@/session/instruction"
import { LLM } from "@/session/llm"
import { LSP } from "@/lsp/lsp"
import { MCP } from "@/mcp"
import { McpAuth } from "@/mcp/auth"
import { Command } from "@/command"
import { Truncate } from "@/tool/truncate"
import { ToolRegistry } from "@/tool/registry"
import { Format } from "@/format"
import { InstanceLayer } from "@/project/instance-layer"
import { Project } from "@/project/project"
import { Vcs } from "@/project/vcs"
import { Worktree } from "@/worktree"
import { Pty } from "@/pty"
import { PtyTicket } from "@/pty/ticket"
import { Installation } from "@/installation"
import { SyncEvent } from "@/sync"
import { Npm } from "@interbase/core/npm"
import { memoMap } from "@interbase/core/effect/memo-map"
import {
  ACTIVE_FEATURE_ASSEMBLY,
  activeFeatureBundleLayer,
  activeFeatureOwnedLayer,
  type FeatureAssemblyState,
} from "@/feature/assembly"
import { ProviderAccountAuthority } from "@/account/authority"

export function createAppLayerFromFeatureAssembly(assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY) {
  return createAppLayer(assembly.layer()).pipe(
    Layer.provide(
      createAccountLayer(
        assembly.ownedLayer(
          "provider-account-authority",
          ProviderAccountAuthority.defaultLayer,
        ) as Layer.Layer<ProviderAccountAuthority.Service>,
      ),
    ),
  )
}

export function createAppLayer(extensionLayer = activeFeatureBundleLayer()) {
  return Layer.mergeAll(
    Npm.defaultLayer,
    AppFileSystem.defaultLayer,
    Bus.defaultLayer,
    Auth.defaultLayer,
    Account.defaultLayer,
    Config.defaultLayer,
    Git.defaultLayer,
    Ripgrep.defaultLayer,
    File.defaultLayer,
    FileWatcher.defaultLayer,
    Storage.defaultLayer,
    Snapshot.defaultLayer,
    Plugin.defaultLayer,
    ModelsDev.defaultLayer,
    Provider.defaultLayer,
    ProviderAuth.defaultLayer,
    Agent.defaultLayer,
    Skill.defaultLayer,
    Discovery.defaultLayer,
    Question.defaultLayer,
    Permission.defaultLayer,
    Todo.defaultLayer,
    Session.defaultLayer,
    SessionStatus.defaultLayer,
    SessionRunState.defaultLayer,
    SessionProcessor.defaultLayer,
    SessionCompaction.defaultLayer,
    SessionRevert.defaultLayer,
    SessionSummary.defaultLayer,
    SessionPrompt.defaultLayer,
    Instruction.defaultLayer,
    LLM.defaultLayer,
    LSP.defaultLayer,
    MCP.defaultLayer,
    McpAuth.defaultLayer,
    Command.defaultLayer,
    Truncate.defaultLayer,
    ToolRegistry.defaultLayer,
    Format.defaultLayer,
    Project.defaultLayer,
    Vcs.defaultLayer,
    Worktree.appLayer,
    Pty.defaultLayer,
    PtyTicket.defaultLayer,
    Installation.defaultLayer,
    SyncEvent.defaultLayer,
    extensionLayer,
  ).pipe(Layer.provideMerge(InstanceLayer.layer), Layer.provideMerge(Observability.layer))
}

export const AppLayer = createAppLayerFromFeatureAssembly()

const typedRt = ManagedRuntime.make(AppLayer, { memoMap })
type Runtime = Pick<typeof typedRt, "runSync" | "runPromise" | "runPromiseExit" | "runFork" | "runCallback" | "dispose">
export type AppRuntimeLike = Runtime

function createRuntime(layer: Layer.Layer<any, any, any>) {
  const rt = ManagedRuntime.make(layer as Layer.Layer<any, any, never>, { memoMap })
  const wrap = (effect: Parameters<typeof rt.runSync>[0]) => attach(effect as never) as never
  const runtime: Runtime = {
    runSync(effect: Parameters<typeof rt.runSync>[0]) {
      return rt.runSync(wrap(effect))
    },
    runPromise(effect: Parameters<typeof rt.runPromise>[0], options?: Parameters<typeof rt.runPromise>[1]) {
      return rt.runPromise(wrap(effect), options)
    },
    runPromiseExit(effect: Parameters<typeof rt.runPromiseExit>[0], options?: Parameters<typeof rt.runPromiseExit>[1]) {
      return rt.runPromiseExit(wrap(effect), options)
    },
    runFork(effect: Parameters<typeof rt.runFork>[0]) {
      return rt.runFork(wrap(effect))
    },
    runCallback(effect: Parameters<typeof rt.runCallback>[0]) {
      return rt.runCallback(wrap(effect))
    },
    dispose: () => rt.dispose(),
  }
  return { runtime, rt }
}

const { runtime: defaultRuntime, rt } = createRuntime(AppLayer)
export function createAppRuntimeFromFeatureAssembly(assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY): Runtime {
  return createRuntime(createAppLayerFromFeatureAssembly(assembly)).runtime
}

/** Services provided by AppRuntime — i.e. what an Effect run via AppRuntime.runPromise can yield. */
export type AppServices = ManagedRuntime.ManagedRuntime.Services<typeof rt>

export const AppRuntime: Runtime = defaultRuntime
