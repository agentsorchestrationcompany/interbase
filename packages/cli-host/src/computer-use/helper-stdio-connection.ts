import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ComputerUseProtocolError } from "@interbase/computer-use-protocol"
import type { HelperLaunchCommand } from "@/computer-use/helper-launch"
import type { HelperRpcConnection } from "@/computer-use/helper-rpc-client"

export function createHelperStdioConnection(command: HelperLaunchCommand, input: { timeoutMs?: number } = {}): HelperRpcConnection {
  if (command.launchMethod === "launchServicesPersistentFileRpc" && command.appPath) return createPersistentLaunchServicesFileConnection(command, input)
  return createPersistentHelperStdioConnection(command, input)
}

type PendingRequest = {
  resolve: (line: string) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

function createPersistentLaunchServicesFileConnection(command: HelperLaunchCommand, input: { timeoutMs?: number } = {}): HelperRpcConnection {
  const timeoutMs = input.timeoutMs ?? 5_000
  const dir = mkdtempSync(join(tmpdir(), "interbase-helper-rpc-"))
  let started = false
  let closed = false
  let sequence = 0
  let queue = Promise.resolve()

  function ensureStarted() {
    if (started) return
    if (closed) throw new ComputerUseProtocolError("helper_unavailable", "helper connection is closed")
    const child = spawn(command.command, [...command.args, "-g", "-n", command.appPath!, "--args", "--request-dir", dir], {
      detached: true,
      env: { ...process.env, ...command.env },
      stdio: "ignore",
    })
    child.unref()
    started = true
  }

  async function send(line: string) {
    ensureStarted()
    const id = `${Date.now().toString(36)}_${++sequence}`
    const requestPath = join(dir, `${id}.request`)
    const pendingPath = join(dir, `${id}.request.tmp`)
    const responsePath = join(dir, `${id}.response`)
    writeFileSync(pendingPath, line, "utf8")
    renameSync(pendingPath, requestPath)
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (existsSync(responsePath)) {
        const response = readFileSync(responsePath, "utf8")
        rmSync(responsePath, { force: true })
        if (!response.trim()) throw new ComputerUseProtocolError("invalid_response", "Helper did not return a response")
        return response.endsWith("\n") ? response : `${response}\n`
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    rmSync(requestPath, { force: true })
    throw new ComputerUseProtocolError("helper_unavailable", "helper request timed out")
  }

  return {
    request: (line) => {
      const request = queue.then(() => send(line))
      queue = request.then(
        () => undefined,
        () => undefined,
      )
      return request
    },
    close: () => {
      closed = true
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

function createPersistentHelperStdioConnection(command: HelperLaunchCommand, input: { timeoutMs?: number } = {}): HelperRpcConnection {
  const timeoutMs = input.timeoutMs ?? 5_000
  let child: ChildProcessWithoutNullStreams | undefined
  let stdout = ""
  let stderr = ""
  let pending: PendingRequest | undefined
  let closed = false
  let queue = Promise.resolve()

  function ensureChild() {
    if (child && !child.killed && child.exitCode === null) return child
    if (closed) throw new ComputerUseProtocolError("helper_unavailable", "helper connection is closed")
    child = spawn(command.command, command.args, {
      env: { ...process.env, ...command.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    stdout = ""
    stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
      drainStdout()
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", (error) => rejectPending(new ComputerUseProtocolError("helper_unavailable", error.message)))
    child.on("exit", (code, signal) => {
      const detail = stderr.trim() || `helper exited with ${signal ? `signal ${signal}` : `status ${String(code)}`}`
      rejectPending(new ComputerUseProtocolError("helper_unavailable", detail))
    })
    return child
  }

  function drainStdout() {
    if (!pending) return
    const index = stdout.indexOf("\n")
    if (index === -1) return
    const line = stdout.slice(0, index + 1)
    stdout = stdout.slice(index + 1)
    const current = pending
    pending = undefined
    clearTimeout(current.timer)
    current.resolve(line)
  }

  function rejectPending(error: Error) {
    if (!pending) return
    const current = pending
    pending = undefined
    clearTimeout(current.timer)
    current.reject(error)
  }

  async function send(line: string) {
    const proc = ensureChild()
    if (pending) throw new ComputerUseProtocolError("helper_busy", "helper request already pending")
    return await new Promise<string>((resolve, reject) => {
      pending = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const detail = stderr.trim() || "helper request timed out"
          proc.kill("SIGTERM")
          rejectPending(new ComputerUseProtocolError("helper_unavailable", detail))
        }, timeoutMs),
      }
      proc.stdin.write(line, "utf8")
      drainStdout()
    })
  }

  return {
    request: (line) => {
      const request = queue.then(() => send(line))
      queue = request.then(
        () => undefined,
        () => undefined,
      )
      return request
    },
    close: () => {
      closed = true
      child?.stdin.end()
      child?.kill("SIGTERM")
      rejectPending(new ComputerUseProtocolError("helper_unavailable", "helper connection closed"))
    },
  }
}
