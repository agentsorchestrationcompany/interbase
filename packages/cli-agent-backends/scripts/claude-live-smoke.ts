import { mkdtemp, readFile, rm } from "node:fs/promises"
import os, { tmpdir } from "node:os"
import path from "node:path"
import { createClaudeAdapter } from "../src/index.js"

if (import.meta.main) {
  await runClaudeLiveSmoke()
}

export async function runClaudeLiveSmoke() {
  const stateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-claude-live-smoke-"))

  try {
    const claude = createClaudeAdapter({ resolveAuth: smokeAuth, stateDirectory })
    const models = await claude.listModels({ directory: process.cwd() })
    const selectedModel = process.env.CLAUDE_SMOKE_MODEL ?? models.find((model) => model.available)?.id
    if (!selectedModel) {
      throw new Error(
        `No live Anthropic model is available: ${
          models
            .map((model) => model.unavailableReason)
            .filter(Boolean)
            .join("; ") || "model listing returned no available models"
        }`,
      )
    }

    const conversation = await claude.createConversation({
      context: {},
      directory: process.cwd(),
      model: selectedModel,
      providerId: "anthropic",
      title: "Claude live smoke",
    })
    const sent = await claude.sendMessage({
      context: {},
      content:
        "Reply with one short sentence confirming this Interbase Claude adapter live smoke test reached Anthropic.",
      conversationId: conversation.id,
      directory: process.cwd(),
    })
    const text =
      sent.message?.parts
        .map((part) => part.text)
        .filter((part): part is string => Boolean(part))
        .join("\n") ?? ""
    if (!text.trim()) {
      throw new Error("Live Anthropic response did not contain readable text.")
    }

    const detail = await claude.readConversation({
      context: {},
      conversationId: conversation.id,
      directory: process.cwd(),
    })
    if (
      detail.messages.length !== 2 ||
      detail.messages[0]?.role !== "user" ||
      detail.messages[1]?.role !== "assistant"
    ) {
      throw new Error("Claude continuity store did not preserve the live user/assistant transcript.")
    }
    const listed = await claude.listConversations({ context: {}, directory: process.cwd() })
    if (!listed.some((candidate) => candidate.id === conversation.id && candidate.lastText === text)) {
      throw new Error("Claude conversation listing did not expose the persisted live assistant response.")
    }

    console.log(
      JSON.stringify(
        {
          conversationId: conversation.id,
          messageId: sent.messageId,
          model: selectedModel,
          ok: true,
          responsePreview: text.slice(0, 120),
        },
        null,
        2,
      ),
    )
  } finally {
    await rm(stateDirectory, { force: true, recursive: true })
  }
}

export async function smokeAuth() {
  if (process.env.ANTHROPIC_API_KEY) return { apiKey: process.env.ANTHROPIC_API_KEY }
  if (process.env.ANTHROPIC_AUTH_TOKEN) return { authToken: process.env.ANTHROPIC_AUTH_TOKEN }
  const envAuth = authInfoToClaudeAuth(authContentAnthropicEntry(process.env.INTERBASE_AUTH_CONTENT))
  if (envAuth) return envAuth
  return await localAnthropicAuth()
}

export function authContentAnthropicEntry(content: string | undefined) {
  if (!content) return undefined
  const parsed = JSON.parse(content) as unknown
  return isRecord(parsed) ? parsed.anthropic : undefined
}

async function localAnthropicAuth() {
  for (const file of localAuthFiles()) {
    const auth = await readAnthropicAuthFile(file)
    if (auth) return auth
  }
  return undefined
}

function localAuthFiles() {
  const home = os.homedir()
  return [path.join(home, ".local", "share", "interbase", "auth.json")]
}

async function readAnthropicAuthFile(file: string) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown
    if (!isRecord(parsed)) return undefined
    return authInfoToClaudeAuth(parsed.anthropic)
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return undefined
    throw error
  }
}

export function authInfoToClaudeAuth(value: unknown) {
  if (!isRecord(value)) return undefined
  if (value.type === "api" && typeof value.key === "string") return { apiKey: value.key }
  if (value.type === "oauth" && typeof value.access === "string") return { authToken: value.access }
  if (value.type === "wellknown" && typeof value.key === "string") return { apiKey: value.key }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
