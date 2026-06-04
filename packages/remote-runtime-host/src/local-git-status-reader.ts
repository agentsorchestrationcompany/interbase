import type {
  RemoteRuntimeGitRepositoryStatus,
  RemoteRuntimeGitStatusResponse,
  RuntimeWebSocketAllowedDirectory,
} from "@interbase/remote-runtime-contracts"
import { execFile } from "node:child_process"
import { homedir } from "node:os"

const gitStatusOutputMaxBytes = 1024 * 1024
const gitErrorMaxBytes = 2048
const gitCommandTimeoutMs = 5000
const gitConcurrency = 4
const aggregateDiffMaxBytes = 8 * 1024 * 1024

export interface LocalGitStatusReaderInput {
  directories: readonly RuntimeWebSocketAllowedDirectory[]
  includeDiff: boolean
  maxDiffBytes: number
}

export function createLocalGitStatusReader() {
  return async function readGitStatus(input: LocalGitStatusReaderInput): Promise<RemoteRuntimeGitStatusResponse> {
    let aggregateRemaining = Math.min(input.maxDiffBytes * input.directories.length * 2, aggregateDiffMaxBytes)
    const repositories = await mapLimited(input.directories, gitConcurrency, async (directory) => {
      const result = await readDirectoryGitStatus(directory, input, aggregateRemaining)
      aggregateRemaining = Math.max(0, aggregateRemaining - result.bytesUsed)
      return result.repository
    })
    return { repositories }
  }
}

async function readDirectoryGitStatus(
  directory: RuntimeWebSocketAllowedDirectory,
  input: LocalGitStatusReaderInput,
  aggregateRemaining: number,
): Promise<{ bytesUsed: number; repository: RemoteRuntimeGitRepositoryStatus }> {
  const base = emptyRepositoryStatus(directory)
  const root = await runGit(directory.path, ["rev-parse", "--show-toplevel"])
  if (!root.ok) return { bytesUsed: 0, repository: base }

  const repositoryRoot = root.stdout.trim()
  let repository: RemoteRuntimeGitRepositoryStatus = { ...base, isRepository: true, repositoryRoot }
  const head = await runGit(directory.path, ["rev-parse", "HEAD"])
  if (head.ok) repository = { ...repository, head: head.stdout.trim() || null }

  const status = await runGit(directory.path, ["status", "--porcelain=v1", "--branch", "-z", "--", "."], {
    maxBuffer: gitStatusOutputMaxBytes,
  })
  if (!status.ok) {
    return {
      bytesUsed: 0,
      repository: {
        ...repository,
        error: status.overflow ? "Git status output exceeded limit." : sanitizeGitError(status.stderr || status.error),
      },
    }
  }

  repository = { ...repository, ...parsePorcelainStatus(status.stdout) }
  if (!input.includeDiff) return { bytesUsed: 0, repository }

  const stagedBudget = Math.min(input.maxDiffBytes, aggregateRemaining)
  const staged = await readDiff(directory.path, ["diff", "--cached", "--no-ext-diff", "--", "."], stagedBudget)
  aggregateRemaining = Math.max(0, aggregateRemaining - staged.bytesUsed)
  const unstagedBudget = Math.min(input.maxDiffBytes, aggregateRemaining)
  const unstaged = await readDiff(directory.path, ["diff", "--no-ext-diff", "--", "."], unstagedBudget)
  const error = [repository.error, staged.error, unstaged.error].filter(Boolean).join("\n") || null

  return {
    bytesUsed: staged.bytesUsed + unstaged.bytesUsed,
    repository: {
      ...repository,
      diffTruncated: staged.truncated || unstaged.truncated,
      error,
      stagedDiff: staged.diff,
      unstagedDiff: unstaged.diff,
    },
  }
}

function emptyRepositoryStatus(directory: RuntimeWebSocketAllowedDirectory): RemoteRuntimeGitRepositoryStatus {
  return {
    ahead: null,
    behind: null,
    branch: null,
    diffTruncated: false,
    directoryId: directory.directoryId,
    error: null,
    files: [],
    head: null,
    isRepository: false,
    path: directory.path,
    repositoryRoot: null,
    stagedDiff: null,
    unstagedDiff: null,
    upstream: null,
  }
}

function parsePorcelainStatus(stdout: string): Pick<RemoteRuntimeGitRepositoryStatus, "ahead" | "behind" | "branch" | "files" | "upstream"> {
  const parts = stdout.split("\0").filter((part) => part.length > 0)
  const files: RemoteRuntimeGitRepositoryStatus["files"] = []
  let branch: string | null = null
  let upstream: string | null = null
  let ahead: number | null = null
  let behind: number | null = null

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!
    if (part.startsWith("## ")) {
      const parsed = parseBranchHeader(part.slice(3))
      branch = parsed.branch
      upstream = parsed.upstream
      ahead = parsed.ahead
      behind = parsed.behind
      continue
    }
    if (part.length < 4) continue
    const staged = part[0] === " " ? null : part[0]!
    const unstaged = part[1] === " " ? null : part[1]!
    const isRenameOrCopy = staged === "R" || staged === "C"
    const path = part.slice(3)
    const renamedFrom = isRenameOrCopy ? parts[index + 1] ?? null : null
    if (isRenameOrCopy) index += 1
    files.push({
      conflicted: isConflictedStatus(staged, unstaged),
      path,
      renamedFrom,
      staged,
      submodule: false,
      untracked: staged === "?" && unstaged === "?",
      unstaged,
    })
  }
  return { ahead, behind, branch, files, upstream }
}

function parseBranchHeader(header: string) {
  if (header.startsWith("No commits yet on ")) {
    return { ahead: null, behind: null, branch: header.slice("No commits yet on ".length), upstream: null }
  }
  if (header === "HEAD (no branch)") return { ahead: null, behind: null, branch: null, upstream: null }
  const match = /^(?<branch>.+?)(?:\.\.\.(?<upstream>[^\[]+?)(?:\s+\[(?<status>.+)\])?)?$/.exec(header)
  const branch = match?.groups?.branch?.trim() || null
  const upstream = match?.groups?.upstream?.trim() || null
  const status = match?.groups?.status ?? ""
  return {
    ahead: upstream ? Number(/ahead (\d+)/.exec(status)?.[1] ?? 0) : null,
    behind: upstream ? Number(/behind (\d+)/.exec(status)?.[1] ?? 0) : null,
    branch,
    upstream,
  }
}

function isConflictedStatus(staged: string | null, unstaged: string | null) {
  return (
    staged === "U" ||
    unstaged === "U" ||
    (staged === "A" && unstaged === "A") ||
    (staged === "D" && unstaged === "D")
  )
}

async function readDiff(cwd: string, args: string[], maxBytes: number) {
  if (maxBytes <= 0) return { bytesUsed: 0, diff: null, error: null, truncated: true }
  const result = await runGit(cwd, args, { maxBuffer: maxBytes + 4096 })
  if (!result.ok) return { bytesUsed: 0, diff: null, error: sanitizeGitError(result.stderr || result.error), truncated: false }
  const truncated = Buffer.byteLength(result.stdout) > maxBytes
  const diff = truncateUtf8(result.stdout, maxBytes)
  return { bytesUsed: Buffer.byteLength(diff), diff, error: null, truncated }
}

async function runGit(cwd: string, args: string[], options: { maxBuffer?: number } = {}) {
  return await new Promise<
    | { ok: true; stdout: string; stderr: string }
    | { error: string; ok: false; overflow: boolean; stderr: string }
  >((resolve) => {
    execFile(
      "git",
      ["-c", "core.quotepath=false", "-c", "core.pager=cat", "-c", "diff.external=", ...args],
      {
        cwd,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_PAGER: "cat", PAGER: "cat" },
        maxBuffer: options.maxBuffer ?? gitStatusOutputMaxBytes,
        timeout: gitCommandTimeoutMs,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            error: error.message,
            ok: false,
            overflow: /maxBuffer|stdout maxBuffer/i.test(error.message),
            stderr,
          })
          return
        }
        resolve({ ok: true, stderr, stdout })
      },
    )
  })
}

function truncateUtf8(value: string, maxBytes: number) {
  const buffer = Buffer.from(value)
  if (buffer.byteLength <= maxBytes) return value
  return new TextDecoder().decode(buffer.subarray(0, maxBytes))
}

function sanitizeGitError(value: string) {
  const home = homedir()
  return truncateUtf8(value.replaceAll(home, "~").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""), gitErrorMaxBytes)
}

async function mapLimited<TInput, TOutput>(
  inputs: readonly TInput[],
  limit: number,
  fn: (input: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const outputs: TOutput[] = []
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, inputs.length) }, async () => {
      while (cursor < inputs.length) {
        const index = cursor
        cursor += 1
        outputs[index] = await fn(inputs[index]!)
      }
    }),
  )
  return outputs
}
