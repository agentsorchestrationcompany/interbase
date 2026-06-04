import type { Config } from "@/config/config"
import type { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import { Token } from "@/util/token"
import type { MessageV2 } from "./message-v2"

const COMPACTION_BUFFER = 20_000
const DEFAULT_AUTO_COMPACT_RATIO = 0.9

function tokenCount(tokens: MessageV2.Assistant["tokens"]) {
  return tokens.total || tokens.input + tokens.output + tokens.cache.read + tokens.cache.write
}

function bodyAfterPrefixTokenCount(tokens: MessageV2.Assistant["tokens"]) {
  if (tokens.total) return Math.max(0, tokens.total - tokens.cache.read)
  return tokens.input + tokens.output + tokens.cache.write
}

export function hasUsage(tokens: MessageV2.Assistant["tokens"]) {
  return tokenCount(tokens) > 0
}

function zeroTokens(): MessageV2.Assistant["tokens"] {
  return { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
}

function addInputTokens(tokens: MessageV2.Assistant["tokens"], input: number): MessageV2.Assistant["tokens"] {
  if (input <= 0) return tokens
  return {
    ...tokens,
    total: tokens.total === undefined ? undefined : tokens.total + input,
    input: tokens.input + input,
  }
}

function estimateMessages(messages: MessageV2.WithParts[]) {
  if (messages.length === 0) return 0
  return Token.estimate(
    JSON.stringify(
      messages.map((msg) => ({
        role: msg.info.role,
        parts: msg.parts,
      })),
    ),
  )
}

export function tokenStatus(messages: MessageV2.WithParts[]): MessageV2.Assistant["tokens"] {
  const latestUsageIndex = messages.findLastIndex(
    (msg) => msg.info.role === "assistant" && msg.info.finish && !msg.info.error,
  )
  if (latestUsageIndex === -1) return addInputTokens(zeroTokens(), estimateMessages(messages))

  const latest = messages[latestUsageIndex]!.info
  if (latest.role !== "assistant") return zeroTokens()
  return addInputTokens(latest.tokens, estimateMessages(messages.slice(latestUsageIndex + 1)))
}

function resolvedContext(input: { model: Provider.Model }) {
  const context = input.model.limit.context
  if (context === 0) return 0
  return input.model.limit.input ? Math.min(context, input.model.limit.input) : context
}

function limits(input: { cfg: Config.Info; model: Provider.Model }) {
  const context = resolvedContext(input)
  if (context === 0) return { hard: 0, auto: 0 }

  const reserved =
    input.cfg.compaction?.reserved ?? Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))
  return {
    hard: Math.max(0, context - reserved),
    auto: Math.max(0, input.cfg.compaction?.auto_limit ?? Math.floor(context * DEFAULT_AUTO_COMPACT_RATIO)),
  }
}

export function usable(input: { cfg: Config.Info; model: Provider.Model }) {
  const limit = limits(input)
  return Math.max(0, Math.min(limit.hard, limit.auto))
}

export function isOverflow(input: { cfg: Config.Info; tokens: MessageV2.Assistant["tokens"]; model: Provider.Model }) {
  if (input.cfg.compaction?.auto === false) return false
  if (resolvedContext(input) === 0) return false

  const fullCount = tokenCount(input.tokens)
  const limit = limits(input)
  if (fullCount >= limit.hard) return true

  const scopedCount =
    input.cfg.compaction?.scope === "body_after_prefix" ? bodyAfterPrefixTokenCount(input.tokens) : fullCount
  return scopedCount >= limit.auto
}
