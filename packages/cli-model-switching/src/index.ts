export interface CliModelSelection {
  providerID: string
  modelID: string
}

export interface CliSessionModelSelection extends CliModelSelection {
  variant?: string
}

export interface CliPersistedSessionModel {
  providerID: string
  id: string
  variant?: string
}

export interface CliModelTargetIdentity extends CliSessionModelSelection {
  apiID: string
  apiPackage: string
}

export interface CliAssistantOriginIdentity {
  apiID?: string
  apiPackage?: string
  modelID: string
  providerID: string
  variant?: string
}

export type CliReplayCompatibility = "same-target" | "foreign-target"

export function sameModel(a: CliModelSelection | undefined, b: CliModelSelection | undefined) {
  return !!a && !!b && a.providerID === b.providerID && a.modelID === b.modelID
}

export function sameSessionModel(a: CliSessionModelSelection | undefined, b: CliSessionModelSelection | undefined) {
  return sameModel(a, b) && a?.variant === b?.variant
}

export function persistedSessionModelSelection(
  model: CliPersistedSessionModel | undefined,
): CliSessionModelSelection | undefined {
  if (!model) return undefined
  return {
    providerID: model.providerID,
    modelID: model.id,
    variant: model.variant,
  }
}

export function toSessionModelSelection(model: CliSessionModelSelection): CliSessionModelSelection {
  return {
    providerID: model.providerID,
    modelID: model.modelID,
    ...(model.variant ? { variant: model.variant } : {}),
  }
}

export function toRecentModelSelection(model: CliModelSelection): CliModelSelection {
  return {
    providerID: model.providerID,
    modelID: model.modelID,
  }
}

export function resolveSessionScopedModel(
  input: {
    sessionOverride?: CliSessionModelSelection
    persistedSessionModel?: CliSessionModelSelection
    lastUserModel?: CliSessionModelSelection
  },
  isValid: (model: CliModelSelection) => boolean,
): CliSessionModelSelection | undefined {
  const candidates = [input.sessionOverride, input.persistedSessionModel, input.lastUserModel]
  for (const candidate of candidates) {
    if (candidate && isValid(candidate)) return candidate
  }
  return undefined
}

export function resolveCurrentModel(
  input: {
    sessionScopedModel?: CliSessionModelSelection
    agentSelectedModel?: CliModelSelection
    agentConfiguredModel?: CliModelSelection
    fallbackModel?: CliModelSelection
  },
  isValid: (model: CliModelSelection) => boolean,
): CliSessionModelSelection | CliModelSelection | undefined {
  const candidates = [
    input.sessionScopedModel,
    input.agentSelectedModel,
    input.agentConfiguredModel,
    input.fallbackModel,
  ]
  for (const candidate of candidates) {
    if (candidate && isValid(candidate)) return candidate
  }
  return undefined
}

export function selectedModelVariant(input: {
  currentModel?: CliModelSelection
  sessionScopedModel?: CliSessionModelSelection
  storedVariant?: string
}) {
  if (sameModel(input.currentModel, input.sessionScopedModel)) return input.sessionScopedModel?.variant
  return input.storedVariant
}

export function targetIdentity(input: {
  apiID: string
  apiPackage: string
  modelID: string
  providerID: string
  variant?: string
}): CliModelTargetIdentity {
  return {
    apiID: input.apiID,
    apiPackage: input.apiPackage,
    modelID: input.modelID,
    providerID: input.providerID,
    ...(input.variant ? { variant: input.variant } : {}),
  }
}

export function replayCompatibility(input: {
  origin: CliAssistantOriginIdentity
  target: CliModelTargetIdentity
}): CliReplayCompatibility {
  if (input.origin.providerID !== input.target.providerID) return "foreign-target"
  if (input.origin.modelID !== input.target.modelID) return "foreign-target"
  if (input.origin.variant !== input.target.variant) return "foreign-target"
  if (input.origin.apiID !== input.target.apiID) return "foreign-target"
  if (input.origin.apiPackage !== input.target.apiPackage) return "foreign-target"
  return "same-target"
}

export function preservesProviderArtifacts(input: {
  origin: CliAssistantOriginIdentity
  target: CliModelTargetIdentity
}) {
  return replayCompatibility(input) === "same-target"
}
