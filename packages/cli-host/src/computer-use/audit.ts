import { PROTOCOL_VERSION, type AppRef, type DriverStatus, type RedactionSummary } from "@interbase/computer-use-protocol"

export type AuditEvent =
  | { type: "computer.observe.requested"; traceId: string; sessionId: string; target?: unknown }
  | { type: "computer.observe.allowed"; traceId: string; observationId: string; app: AppRef; redactionSummary: RedactionSummary }
  | { type: "computer.observe.denied"; traceId: string; reason: string; app?: AppRef }
  | { type: "computer.action.requested"; traceId: string; actionId: string; actionType: string; target?: unknown }
  | { type: "computer.policy.decision"; traceId: string; decision: { allowed: boolean; reason?: string; app?: AppRef; actionType?: string } }
  | { type: "computer.approval.prompted"; traceId: string; permissionRequestId: string; permission: string; risk?: string }
  | { type: "computer.approval.responded"; traceId: string; permissionRequestId: string; reply: "once" | "always" | "reject" }
  | { type: "computer.action.allowed"; traceId: string; actionId: string }
  | { type: "computer.action.denied"; traceId: string; actionId: string; reason: string }
  | { type: "computer.driver.status"; traceId: string; status: DriverStatus }
  | { type: "computer.driver.crashed"; traceId: string; exitCode?: number }
  | { type: "computer.artifact.created"; traceId: string; artifactId: string; kind: string; ttlMs: number }
  | { type: "computer.artifact.deleted"; traceId: string; artifactId: string; reason: string }
  | { type: "computer.approval.revoked"; traceId: string; scope: string; revokedActions: number }

export type SanitizedAuditEvent = AuditEvent & { rawContentStored: false }

export function sanitizeAuditEvent(event: AuditEvent): SanitizedAuditEvent {
  if (event.type === "computer.observe.requested") {
    return {
      type: event.type,
      traceId: event.traceId,
      sessionId: event.sessionId,
      target: summarizeTarget(event.target),
      rawContentStored: false,
    }
  }
  if (event.type === "computer.action.requested") {
    return {
      type: event.type,
      traceId: event.traceId,
      actionId: event.actionId,
      actionType: event.actionType,
      target: summarizeTarget(event.target),
      rawContentStored: false,
    }
  }
  if (event.type === "computer.policy.decision") {
    return {
      type: event.type,
      traceId: event.traceId,
      decision: {
        allowed: event.decision.allowed,
        reason: event.decision.reason,
        actionType: event.decision.actionType,
        app: summarizeApp(event.decision.app),
      },
      rawContentStored: false,
    }
  }
  if (event.type === "computer.driver.status") {
    return {
      type: event.type,
      traceId: event.traceId,
      status: summarizeDriverStatus(event.status),
      rawContentStored: false,
    }
  }
  return { ...event, rawContentStored: false }
}

export function createAuditBuffer() {
  const events: SanitizedAuditEvent[] = []
  return {
    record: (event: AuditEvent) => events.push(sanitizeAuditEvent(event)),
    list: () => [...events],
    clear: () => {
      events.splice(0, events.length)
    },
  }
}

function summarizeTarget(target: unknown) {
  if (target === undefined || target === null || typeof target !== "object") return target
  const record = target as Record<string, unknown>
  return {
    app: summarizeApp(record.app),
    windowId: typeof record.windowId === "string" ? record.windowId : undefined,
  }
}

function summarizeApp(input: unknown): AppRef | undefined {
  if (input === undefined || input === null || typeof input !== "object") return undefined
  const record = input as Record<string, unknown>
  if (typeof record.name !== "string") return undefined
  return {
    name: record.name,
    bundleId: typeof record.bundleId === "string" ? record.bundleId : undefined,
    path: typeof record.path === "string" ? record.path : undefined,
  }
}

function summarizeDriverStatus(status: DriverStatus): DriverStatus & { protocolVersion: string } {
  return {
    protocolVersion: PROTOCOL_VERSION,
    available: status.available,
    crashed: status.crashed,
    health: status.health
      ? {
          protocolMajor: status.health.protocolMajor,
          driver: status.health.driver,
          version: status.health.version,
          capabilities: [...status.health.capabilities],
        }
      : undefined,
    authenticity: status.authenticity,
    permissionState: status.permissionState,
    missingPermissions: [...status.missingPermissions],
  }
}
