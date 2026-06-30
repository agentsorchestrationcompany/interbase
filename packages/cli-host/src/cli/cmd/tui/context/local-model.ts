import { DEFAULT_SERVICE_TIER, FAST_SERVICE_TIER } from "@/provider/service-tier"

export type CliModelServiceTier = {
  id: string
  name: string
  description?: string
}

export function fastServiceTier(tiers: CliModelServiceTier[] | undefined) {
  return tiers?.find((tier) => tier.id === FAST_SERVICE_TIER)
}

export function resolveModelServiceTier(input: {
  configured?: string
  serviceTiers?: CliModelServiceTier[]
  defaultServiceTier?: string
}) {
  if (input.configured === DEFAULT_SERVICE_TIER) return input.serviceTiers?.length ? DEFAULT_SERVICE_TIER : undefined
  if (input.configured && input.serviceTiers?.some((tier) => tier.id === input.configured)) return input.configured
  if (input.defaultServiceTier && input.serviceTiers?.some((tier) => tier.id === input.defaultServiceTier)) {
    return input.defaultServiceTier
  }
  return undefined
}

export {
  persistedSessionModelSelection,
  resolveCurrentModel,
  resolveSessionScopedModel,
  sameModel,
  sameSessionModel,
  selectedModelVariant,
  toRecentModelSelection,
  toSessionModelSelection,
  type CliModelSelection as TuiModelSelection,
  type CliPersistedSessionModel as TuiPersistedSessionModel,
  type CliSessionModelSelection as TuiSessionModelSelection,
} from "@interbase/cli-model-switching"
