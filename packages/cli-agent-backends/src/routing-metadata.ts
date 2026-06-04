import path from "node:path"
import {
  createJsonStateStore,
  stateFilePathFromAbsolute,
  type JsonStateSchema,
  type JsonValue,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
} from "@interbase/cli-local-state"
import { isLocalBackendId } from "./backend.js"
import type { LocalBackendId } from "./types.js"

export interface LocalRoutingMetadataRecord {
  backendConversationId: string
  backendId: LocalBackendId
  conversationId: string
  createdAt: string
  directory: string
  title: string | null
  updatedAt: string
}

interface LocalRoutingMetadataFile {
  records: LocalRoutingMetadataRecord[]
  version: 1
}

const routingMetadataSchema: JsonStateSchema<LocalRoutingMetadataFile> = {
  parse(value) {
    if (!isJsonObject(value) || value.version !== 1 || !Array.isArray(value.records)) {
      throw new Error("invalid schema")
    }
    return { records: value.records.map(parseRoutingMetadataRecord), version: 1 }
  },
}

export interface LocalRoutingMetadataStore {
  get(input: { conversationId: string; directory: string }): Promise<LocalRoutingMetadataRecord | null>
  list(input: { directory: string }): Promise<LocalRoutingMetadataRecord[]>
  put(record: LocalRoutingMetadataRecord): Promise<void>
}

export function createJsonRoutingMetadataStore(input: {
  accessPolicy?: RuntimeAccessPolicyInput
  stateDirectory: string
  stateFilePath?: StateFilePath
}): LocalRoutingMetadataStore {
  const filePath = input.stateFilePath ?? stateFilePathFromAbsolute(path.join(input.stateDirectory, "routes.json"))
  const state = createJsonStateStore<LocalRoutingMetadataFile>({
    accessPolicy: input.accessPolicy ?? { kind: "production" },
    concurrency: "multiProcess",
    defaultValue: () => ({ records: [], version: 1 }),
    kind: "mobile backend routing metadata",
    path: filePath,
    recoverability: "reconstructable",
    schema: routingMetadataSchema,
    version: 1,
  })

  return {
    async get(recordInput) {
      return (
        (await state.read()).records.find(
          (record) =>
            record.directory === recordInput.directory && record.conversationId === recordInput.conversationId,
        ) ?? null
      )
    },
    async list(recordInput) {
      return (await state.read()).records.filter((record) => record.directory === recordInput.directory)
    },
    async put(record) {
      await state.update((file) => ({
        records: [
          ...file.records.filter(
            (candidate) =>
              !(candidate.directory === record.directory && candidate.conversationId === record.conversationId),
          ),
          record,
        ],
        version: 1,
      }))
    },
  }
}

export function createMemoryRoutingMetadataStore(
  initial: LocalRoutingMetadataRecord[] = [],
): LocalRoutingMetadataStore {
  const records = [...initial]
  return {
    async get(input) {
      return (
        records.find(
          (record) => record.directory === input.directory && record.conversationId === input.conversationId,
        ) ?? null
      )
    },
    async list(input) {
      return records.filter((record) => record.directory === input.directory)
    },
    async put(record) {
      const index = records.findIndex(
        (candidate) => candidate.directory === record.directory && candidate.conversationId === record.conversationId,
      )
      if (index >= 0) records.splice(index, 1, record)
      else records.push(record)
    },
  }
}

function parseRoutingMetadataRecord(value: JsonValue): LocalRoutingMetadataRecord {
  if (
    !isJsonObject(value) ||
    typeof value.backendConversationId !== "string" ||
    !isLocalBackendId(value.backendId) ||
    typeof value.conversationId !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.directory !== "string" ||
    (typeof value.title !== "string" && value.title !== null) ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("invalid schema")
  }
  return {
    backendConversationId: value.backendConversationId,
    backendId: value.backendId,
    conversationId: value.conversationId,
    createdAt: value.createdAt,
    directory: value.directory,
    title: value.title,
    updatedAt: value.updatedAt,
  }
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
