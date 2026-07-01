import { afterEach, describe, expect } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { Effect, Layer } from "effect"
import { CrossSpawnSpawner } from "@interbase/core/cross-spawn-spawner"
import { ToolRegistry } from "@/tool/registry"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestConfig } from "../fixture/config"
import { AppFileSystem } from "@interbase/core/filesystem"
import { Plugin } from "@/plugin"
import { Question } from "@/question"
import { Todo } from "@/session/todo"
import { Skill } from "@/skill"
import { Agent } from "@/agent/agent"
import { Session } from "@/session/session"
import { Provider } from "@/provider/provider"
import { LSP } from "@/lsp/lsp"
import { Instruction } from "@/session/instruction"
import { Bus } from "@/bus"
import { FetchHttpClient } from "effect/unstable/http"
import { Format } from "@/format"
import { Ripgrep } from "@/file/ripgrep"
import * as Truncate from "@/tool/truncate"
import { InstanceState } from "@/effect/instance-state"
import { GlobalBus } from "@/bus/global"

const node = CrossSpawnSpawner.defaultLayer
const configLayer = TestConfig.layer({
  directories: () => InstanceState.directory.pipe(Effect.map((dir) => [path.join(dir, ".interbase")])),
})

const registryLayer = ToolRegistry.layer.pipe(
  Layer.provide(configLayer),
  Layer.provide(Plugin.defaultLayer),
  Layer.provide(Question.defaultLayer),
  Layer.provide(Todo.defaultLayer),
  Layer.provide(Skill.defaultLayer),
  Layer.provide(Agent.defaultLayer),
  Layer.provide(Session.defaultLayer),
  Layer.provide(Provider.defaultLayer),
  Layer.provide(LSP.defaultLayer),
  Layer.provide(Instruction.defaultLayer),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(Bus.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(Format.defaultLayer),
  Layer.provide(node),
  Layer.provide(Ripgrep.defaultLayer),
  Layer.provide(Truncate.defaultLayer),
)

const it = testEffect(Layer.mergeAll(registryLayer, node))

afterEach(async () => {
  await disposeAllInstances()
})

describe("tool.registry", () => {
  it.instance("loads tools from .interbase/tool (singular)", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tool = path.join(interbase, "tool")
      yield* Effect.promise(() => fs.mkdir(tool, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(tool, "hello.ts"),
          [
            "export default {",
            "  description: 'hello tool',",
            "  args: {},",
            "  execute: async () => {",
            "    return 'hello world'",
            "  },",
            "}",
            "",
          ].join("\n"),
        ),
      )
      const registry = yield* ToolRegistry.Service
      const ids = yield* registry.ids()
      expect(ids).toContain("hello")
    }),
  )

  it.instance("loads tools from .interbase/tools (plural)", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tools = path.join(interbase, "tools")
      yield* Effect.promise(() => fs.mkdir(tools, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(tools, "hello.ts"),
          [
            "export default {",
            "  description: 'hello tool',",
            "  args: {},",
            "  execute: async () => {",
            "    return 'hello world'",
            "  },",
            "}",
            "",
          ].join("\n"),
        ),
      )
      const registry = yield* ToolRegistry.Service
      const ids = yield* registry.ids()
      expect(ids).toContain("hello")
    }),
  )

  it.instance("preserves custom tool IDs with provider-unsafe characters", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tools = path.join(interbase, "tools")
      yield* Effect.promise(() => fs.mkdir(tools, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(tools, "hello.world tool.ts"),
          [
            "export default {",
            "  description: 'hello tool',",
            "  args: {},",
            "  execute: async () => 'hello world',",
            "}",
            "",
          ].join("\n"),
        ),
      )

      const registry = yield* ToolRegistry.Service
      const ids = yield* registry.ids()
      expect(ids).toContain("hello.world tool")
    }),
  )

  it.instance("loads tools with external dependencies without crashing", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tools = path.join(interbase, "tools")
      yield* Effect.promise(() => fs.mkdir(tools, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(interbase, "package.json"),
          JSON.stringify({
            name: "custom-tools",
            dependencies: {
              "@interbase/plugin": "^0.0.0",
              cowsay: "^1.6.0",
            },
          }),
        ),
      )
      yield* Effect.promise(() =>
        Bun.write(
          path.join(interbase, "package-lock.json"),
          JSON.stringify({
            name: "custom-tools",
            lockfileVersion: 3,
            packages: {
              "": {
                dependencies: {
                  "@interbase/plugin": "^0.0.0",
                  cowsay: "^1.6.0",
                },
              },
            },
          }),
        ),
      )

      const cowsay = path.join(interbase, "node_modules", "cowsay")
      yield* Effect.promise(() => fs.mkdir(cowsay, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(cowsay, "package.json"),
          JSON.stringify({
            name: "cowsay",
            type: "module",
            exports: "./index.js",
          }),
        ),
      )
      yield* Effect.promise(() =>
        Bun.write(
          path.join(cowsay, "index.js"),
          ["export function say({ text }) {", "  return `moo ${text}`", "}", ""].join("\n"),
        ),
      )
      yield* Effect.promise(() =>
        Bun.write(
          path.join(tools, "cowsay.ts"),
          [
            "import { say } from 'cowsay'",
            "export default {",
            "  description: 'tool that imports cowsay at top level',",
            "  args: { text: { type: 'string' } },",
            "  execute: async ({ text }: { text: string }) => {",
            "    return say({ text })",
            "  },",
            "}",
            "",
          ].join("\n"),
        ),
      )
      const registry = yield* ToolRegistry.Service
      const ids = yield* registry.ids()
      expect(ids).toContain("cowsay")
    }),
  )

  it.instance("passes call, provider, and model IDs into plugin tool context", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tool = path.join(interbase, "tool")
      const output = path.join(test.directory, "context.json")
      yield* Effect.promise(() => fs.mkdir(tool, { recursive: true }))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(tool, "context.ts"),
          [
            "export default {",
            "  description: 'capture plugin tool context',",
            "  args: {},",
            "  execute: async (_args, context) => {",
            `    await Bun.write(${JSON.stringify(output)}, JSON.stringify({ callID: context.callID, providerID: context.providerID, modelID: context.modelID }))`,
            "    return 'ok'",
            "  },",
            "}",
            "",
          ].join("\n"),
        ),
      )

      const registry = yield* ToolRegistry.Service
      const contextTool = (yield* registry.all()).find((item) => item.id === "context")
      expect(contextTool).toBeDefined()
      yield* contextTool!.execute(
        {},
        {
          sessionID: "ses_context" as any,
          messageID: "msg_context" as any,
          callID: "call_context",
          providerID: "provider_context",
          modelID: "model_context",
          agent: "build",
          abort: AbortSignal.any([]),
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )
      expect(JSON.parse(yield* Effect.promise(() => Bun.file(output).text()))).toEqual({
        callID: "call_context",
        providerID: "provider_context",
        modelID: "model_context",
      })
    }),
  )

  it.instance("invalidates custom tool cache on config invalidate events", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const interbase = path.join(test.directory, ".interbase")
      const tool = path.join(interbase, "tool")
      yield* Effect.promise(() => fs.mkdir(tool, { recursive: true }))
      yield* Effect.promise(() => Bun.write(path.join(tool, "first.ts"), "export default { description: 'first', args: {}, execute: async () => 'first' }"))

      const registry = yield* ToolRegistry.Service
      expect(yield* registry.ids()).toContain("first")

      yield* Effect.promise(() => Bun.write(path.join(tool, "second.ts"), "export default { description: 'second', args: {}, execute: async () => 'second' }"))
      expect(yield* registry.ids()).not.toContain("second")

      yield* Effect.sync(() => GlobalBus.emit("event", { directory: test.directory, payload: { type: "config.invalidate" } }))
      yield* Effect.promise(() => Bun.sleep(10))
      expect(yield* registry.ids()).toContain("second")
    }),
  )
})
