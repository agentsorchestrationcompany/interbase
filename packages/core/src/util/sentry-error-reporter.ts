import { randomUUID } from "node:crypto"

export interface ErrorReportInput {
  error: unknown
  event: string
  extra?: Record<string, unknown>
  level?: "error" | "warning" | "info"
  tags?: Record<string, string>
}

export interface ErrorReporter {
  report(input: ErrorReportInput): Promise<void>
  reportAsync(input: ErrorReportInput): void
}

type SentryConfig = {
  dsn: string
  environment: string | null
  release: string | null
  serverName: string
}

type ParsedSentryDsn = {
  baseUrl: string
  projectId: string
}

type CreateSentryErrorReporterOptions = {
  defaultDsn?: string
  defaultServerName?: string
}

function readOptionalTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function parseSentryDsn(dsn: string): ParsedSentryDsn {
  const parsed = new URL(dsn)
  const pathSegments = parsed.pathname.split("/").filter(Boolean)
  const projectId = pathSegments.pop()

  if (!projectId) {
    throw new Error("SENTRY_DSN must include a project identifier.")
  }

  const basePath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : ""
  return {
    baseUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
    projectId,
  }
}

function createSentryEnvelope(config: SentryConfig, input: ErrorReportInput, now = new Date()) {
  const eventId = randomUUID().replace(/-/g, "")
  const normalizedError =
    input.error instanceof Error ? input.error : new Error(typeof input.error === "string" ? input.error : input.event)
  const exceptionType = normalizedError.name && normalizedError.name.trim().length > 0 ? normalizedError.name : "Error"
  const exceptionValue =
    normalizedError.message && normalizedError.message.trim().length > 0 ? normalizedError.message : input.event
  const payload = {
    eventId,
    timestamp: now.toISOString(),
    level: input.level ?? "error",
    platform: "node",
    serverName: config.serverName,
    ...(config.environment ? { environment: config.environment } : {}),
    ...(config.release ? { release: config.release } : {}),
    tags: {
      event: input.event,
      ...(input.tags ?? {}),
    },
    extra: {
      ...(input.extra ?? {}),
    },
    exception: {
      values: [
        {
          type: exceptionType,
          value: exceptionValue,
          ...(normalizedError.stack ? { stacktrace: { frames: [] } } : {}),
        },
      ],
    },
  }

  const envelopeHeaders = {
    eventId,
    sentAt: now.toISOString(),
    dsn: config.dsn,
  }

  return [JSON.stringify(envelopeHeaders), JSON.stringify({ type: "event" }), JSON.stringify(payload)].join("\n")
}

export function createSentryErrorReporter(
  environment = process.env,
  fetchImplementation: typeof fetch = fetch,
  options: CreateSentryErrorReporterOptions = {},
): ErrorReporter {
  const dsn = readOptionalTrimmedString(environment.SENTRY_DSN) ?? readOptionalTrimmedString(options.defaultDsn)
  const config =
    dsn === null
      ? null
      : {
          dsn,
          environment:
            readOptionalTrimmedString(environment.SENTRY_ENVIRONMENT) ??
            readOptionalTrimmedString(environment.NODE_ENV),
          release: readOptionalTrimmedString(environment.SENTRY_RELEASE),
          serverName:
            readOptionalTrimmedString(environment.SENTRY_SERVER_NAME) ??
            options.defaultServerName ??
            "interbase-runtime",
        }

  return {
    async report(input) {
      if (!config) {
        return
      }

      const parsedDsn = parseSentryDsn(config.dsn)
      const envelope = createSentryEnvelope(config, input)

      await fetchImplementation(`${parsedDsn.baseUrl}/api/${parsedDsn.projectId}/envelope/`, {
        method: "POST",
        headers: {
          "content-type": "application/x-sentry-envelope",
        },
        body: envelope,
      })
    },
    reportAsync(input) {
      void this.report(input).catch(() => {})
    },
  }
}
