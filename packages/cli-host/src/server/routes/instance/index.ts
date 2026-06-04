import { describeRoute, resolver, validator } from "hono-openapi"
import { Hono } from "hono"
import type { UpgradeWebSocket } from "hono/ws"
import { Context, Effect } from "effect"
import { Flag } from "@interbase/core/flag/flag"
import z from "zod"
import { Format } from "@/format"
import { createTuiRoutes } from "./tui"
import { Instance } from "@/project/instance"
import { InstanceRuntime } from "@/project/instance-runtime"
import { Vcs } from "@/project/vcs"
import { Agent } from "@/agent/agent"
import { Skill } from "@/skill"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { LSP } from "@/lsp/lsp"
import { Command } from "@/command"
import { createQuestionRoutes } from "./question"
import { createPermissionRoutes } from "./permission"
import { createProjectRoutes } from "./project"
import { createSessionRoutes } from "./session"
import { createPtyRoutes } from "./pty"
import { createMcpRoutes } from "./mcp"
import { createFileRoutes } from "./file"
import { ConfigRoutes } from "./config"
import { ExperimentalRoutes } from "./experimental"
import { createProviderRoutes } from "./provider"
import { EventRoutes } from "./event"
import { createSyncRoutes } from "./sync"
import { jsonRequest } from "./trace"
import { ExperimentalHttpApiServer } from "./httpapi/server"
import { EventPaths } from "./httpapi/event"
import { ExperimentalPaths } from "./httpapi/groups/experimental"
import { FilePaths } from "./httpapi/groups/file"
import { InstancePaths } from "./httpapi/groups/instance"
import { McpPaths } from "./httpapi/groups/mcp"
import { PtyPaths } from "./httpapi/groups/pty"
import { SessionPaths } from "./httpapi/groups/session"
import { SyncPaths } from "./httpapi/groups/sync"
import { TuiPaths } from "./httpapi/groups/tui"
import type { CorsOptions } from "@/server/cors"
import { ACTIVE_FEATURE_BUNDLES } from "@/feature/assembly"
import type { FeatureBundle } from "@/feature/bundle"
import { AppRuntime, type AppRuntimeLike } from "@/effect/app-runtime"
import { createConfigRoutes } from "./config"
import { createExperimentalRoutes } from "./experimental"

export const InstanceRoutes = (
  upgrade: UpgradeWebSocket,
  opts?: CorsOptions,
  bundles: readonly FeatureBundle[] = ACTIVE_FEATURE_BUNDLES,
  runtime: AppRuntimeLike = AppRuntime,
): Hono => {
  const app = new Hono()
  const handler = ExperimentalHttpApiServer.webHandler(opts, bundles).handler
  const context = Context.empty() as Context.Context<unknown>

  app.all("/api/*", (c) => handler(c.req.raw, context))

  if (Flag.INTERBASE_EXPERIMENTAL_HTTPAPI) {
    app.get(EventPaths.event, (c) => handler(c.req.raw, context))
    app.get("/question", (c) => handler(c.req.raw, context))
    app.post("/question/:requestID/reply", (c) => handler(c.req.raw, context))
    app.post("/question/:requestID/reject", (c) => handler(c.req.raw, context))
    app.get("/permission", (c) => handler(c.req.raw, context))
    app.post("/permission/:requestID/reply", (c) => handler(c.req.raw, context))
    app.get("/config", (c) => handler(c.req.raw, context))
    app.patch("/config", (c) => handler(c.req.raw, context))
    app.get("/config/providers", (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.console, (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.tool, (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.toolIDs, (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.worktree, (c) => handler(c.req.raw, context))
    app.post(ExperimentalPaths.worktree, (c) => handler(c.req.raw, context))
    app.delete(ExperimentalPaths.worktree, (c) => handler(c.req.raw, context))
    app.post(ExperimentalPaths.worktreeReset, (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.session, (c) => handler(c.req.raw, context))
    app.get(ExperimentalPaths.resource, (c) => handler(c.req.raw, context))
    app.get("/provider", (c) => handler(c.req.raw, context))
    app.get("/provider/auth", (c) => handler(c.req.raw, context))
    app.post("/provider/:providerID/oauth/authorize", (c) => handler(c.req.raw, context))
    app.post("/provider/:providerID/oauth/callback", (c) => handler(c.req.raw, context))
    app.get("/project", (c) => handler(c.req.raw, context))
    app.get("/project/current", (c) => handler(c.req.raw, context))
    app.post("/project/git/init", (c) => handler(c.req.raw, context))
    app.patch("/project/:projectID", (c) => handler(c.req.raw, context))
    app.get(FilePaths.findText, (c) => handler(c.req.raw, context))
    app.get(FilePaths.findFile, (c) => handler(c.req.raw, context))
    app.get(FilePaths.findSymbol, (c) => handler(c.req.raw, context))
    app.get(FilePaths.list, (c) => handler(c.req.raw, context))
    app.get(FilePaths.content, (c) => handler(c.req.raw, context))
    app.get(FilePaths.status, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.path, (c) => handler(c.req.raw, context))
    app.post(InstancePaths.dispose, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.vcs, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.vcsDiff, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.command, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.agent, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.skill, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.lsp, (c) => handler(c.req.raw, context))
    app.get(InstancePaths.formatter, (c) => handler(c.req.raw, context))
    app.get(McpPaths.status, (c) => handler(c.req.raw, context))
    app.post(McpPaths.status, (c) => handler(c.req.raw, context))
    app.post(McpPaths.auth, (c) => handler(c.req.raw, context))
    app.post(McpPaths.authCallback, (c) => handler(c.req.raw, context))
    app.post(McpPaths.authAuthenticate, (c) => handler(c.req.raw, context))
    app.delete(McpPaths.auth, (c) => handler(c.req.raw, context))
    app.post(McpPaths.connect, (c) => handler(c.req.raw, context))
    app.post(McpPaths.disconnect, (c) => handler(c.req.raw, context))
    app.post(SyncPaths.replay, (c) => handler(c.req.raw, context))
    app.post(SyncPaths.history, (c) => handler(c.req.raw, context))
    app.get(PtyPaths.list, (c) => handler(c.req.raw, context))
    app.post(PtyPaths.create, (c) => handler(c.req.raw, context))
    app.get(PtyPaths.get, (c) => handler(c.req.raw, context))
    app.put(PtyPaths.update, (c) => handler(c.req.raw, context))
    app.delete(PtyPaths.remove, (c) => handler(c.req.raw, context))
    app.post(PtyPaths.connectToken, (c) => handler(c.req.raw, context))
    app.get(PtyPaths.connect, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.list, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.status, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.get, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.children, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.todo, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.diff, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.messages, (c) => handler(c.req.raw, context))
    app.get(SessionPaths.message, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.create, (c) => handler(c.req.raw, context))
    app.delete(SessionPaths.remove, (c) => handler(c.req.raw, context))
    app.patch(SessionPaths.update, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.fork, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.abort, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.summarize, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.prompt, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.promptAsync, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.command, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.shell, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.revert, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.unrevert, (c) => handler(c.req.raw, context))
    app.post(SessionPaths.permissions, (c) => handler(c.req.raw, context))
    app.delete(SessionPaths.deleteMessage, (c) => handler(c.req.raw, context))
    app.delete(SessionPaths.deletePart, (c) => handler(c.req.raw, context))
    app.patch(SessionPaths.updatePart, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.appendPrompt, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.openHelp, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.openSessions, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.openThemes, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.openModels, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.submitPrompt, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.clearPrompt, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.executeCommand, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.showToast, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.publish, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.selectSession, (c) => handler(c.req.raw, context))
    app.get(TuiPaths.controlNext, (c) => handler(c.req.raw, context))
    app.post(TuiPaths.controlResponse, (c) => handler(c.req.raw, context))
  }

  return app
    .route("/project", createProjectRoutes(runtime))
    .route("/pty", createPtyRoutes(upgrade, opts, runtime))
    .route("/config", createConfigRoutes(runtime))
    .route("/experimental", createExperimentalRoutes(runtime))
    .route("/session", createSessionRoutes(runtime))
    .route("/permission", createPermissionRoutes(runtime))
    .route("/question", createQuestionRoutes(runtime))
    .route("/provider", createProviderRoutes(runtime))
    .route("/sync", createSyncRoutes(runtime))
    .route("/", createFileRoutes(runtime))
    .route("/", EventRoutes())
    .route("/mcp", createMcpRoutes(runtime))
    .route("/tui", createTuiRoutes(runtime))
    .post(
      "/instance/dispose",
      describeRoute({
        summary: "Dispose instance",
        description: "Clean up and dispose the current Interbase instance, releasing all resources.",
        operationId: "instance.dispose",
        responses: {
          200: {
            description: "Instance disposed",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
        },
      }),
      async (c) => {
        await InstanceRuntime.disposeInstance(Instance.current)
        return c.json(true)
      },
    )
    .get(
      "/path",
      describeRoute({
        summary: "Get paths",
        description: "Retrieve the current working directory and related path information for the Interbase instance.",
        operationId: "path.get",
        responses: {
          200: {
            description: "Path",
            content: {
              "application/json": {
                schema: resolver(
                  z
                    .object({
                      home: z.string(),
                      state: z.string(),
                      config: z.string(),
                      worktree: z.string(),
                      directory: z.string(),
                    })
                    .meta({
                      ref: "Path",
                    }),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json({
          home: interbaseRuntimeContext.paths.home,
          state: interbaseRuntimeContext.paths.state,
          config: interbaseRuntimeContext.paths.config,
          worktree: Instance.worktree,
          directory: Instance.directory,
        })
      },
    )
    .get(
      "/vcs",
      describeRoute({
        summary: "Get VCS info",
        description: "Retrieve version control system (VCS) information for the current project, such as git branch.",
        operationId: "vcs.get",
        responses: {
          200: {
            description: "VCS info",
            content: {
              "application/json": {
                schema: resolver(Vcs.Info.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.vcs.get", c, function* () {
          const vcs = yield* Vcs.Service
          const [branch, default_branch] = yield* Effect.all([vcs.branch(), vcs.defaultBranch()], {
            concurrency: 2,
          })
          return { branch, default_branch }
        }),
    )
    .get(
      "/vcs/diff",
      describeRoute({
        summary: "Get VCS diff",
        description: "Retrieve the current git diff for the working tree or against the default branch.",
        operationId: "vcs.diff",
        responses: {
          200: {
            description: "VCS diff",
            content: {
              "application/json": {
                schema: resolver(Vcs.FileDiff.zod.array()),
              },
            },
          },
        },
      }),
      validator(
        "query",
        z.object({
          mode: Vcs.Mode.zod,
        }),
      ),
      async (c) =>
        jsonRequest("InstanceRoutes.vcs.diff", c, function* () {
          const vcs = yield* Vcs.Service
          return yield* vcs.diff(c.req.valid("query").mode)
        }),
    )
    .get(
      "/command",
      describeRoute({
        summary: "List commands",
        description: "Get a list of all available commands in the Interbase system.",
        operationId: "command.list",
        responses: {
          200: {
            description: "List of commands",
            content: {
              "application/json": {
                schema: resolver(Command.Info.zod.array()),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.command.list", c, function* () {
          const svc = yield* Command.Service
          return yield* svc.list()
        }),
    )
    .get(
      "/agent",
      describeRoute({
        summary: "List agents",
        description: "Get a list of all available AI agents in the Interbase system.",
        operationId: "app.agents",
        responses: {
          200: {
            description: "List of agents",
            content: {
              "application/json": {
                schema: resolver(Agent.Info.zod.array()),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.agent.list", c, function* () {
          const svc = yield* Agent.Service
          return yield* svc.list()
        }),
    )
    .get(
      "/skill",
      describeRoute({
        summary: "List skills",
        description: "Get a list of all available skills in the Interbase system.",
        operationId: "app.skills",
        responses: {
          200: {
            description: "List of skills",
            content: {
              "application/json": {
                schema: resolver(Skill.Info.zod.array()),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.skill.list", c, function* () {
          const skill = yield* Skill.Service
          return yield* skill.all()
        }),
    )
    .get(
      "/lsp",
      describeRoute({
        summary: "Get LSP status",
        description: "Get LSP server status",
        operationId: "lsp.status",
        responses: {
          200: {
            description: "LSP server status",
            content: {
              "application/json": {
                schema: resolver(LSP.Status.zod.array()),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.lsp.status", c, function* () {
          const lsp = yield* LSP.Service
          return yield* lsp.status()
        }),
    )
    .get(
      "/formatter",
      describeRoute({
        summary: "Get formatter status",
        description: "Get formatter status",
        operationId: "formatter.status",
        responses: {
          200: {
            description: "Formatter status",
            content: {
              "application/json": {
                schema: resolver(Format.Status.zod.array()),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("InstanceRoutes.formatter.status", c, function* () {
          const svc = yield* Format.Service
          return yield* svc.status()
        }),
    )
}
