import { Schema } from "effect"
import { withStatics, type DeepMutable, PositiveInt } from "@/util/schema"
import { zod } from "@/util/effect-zod"
import z from "zod"
import { normalizeConfig, type ComputerUsePolicyConfig } from "@interbase/computer-use-policy"

export const AppDenyRule = Schema.Struct({
  name: Schema.optional(Schema.String),
  bundleId: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})

export const ModelAttachment = Schema.Struct({
  allow_screenshots_to_remote_models: Schema.optional(Schema.Literals(["never", "confirm", "always"])),
  allow_ax_text_to_remote_models: Schema.optional(Schema.Literals(["none", "redacted_summary_only"])),
  require_confirmation_for_screenshots: Schema.optional(Schema.Boolean),
})

const RawInfo = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  backend: Schema.optional(Schema.Literal("native")),
  mock: Schema.optional(Schema.Never),
  app_denylist: Schema.optional(Schema.mutable(Schema.Array(AppDenyRule))),
  artifact_retention_ms: Schema.optional(PositiveInt),
  max_artifact_bytes: Schema.optional(PositiveInt),
  max_session_artifact_bytes: Schema.optional(PositiveInt),
  max_global_artifact_bytes: Schema.optional(PositiveInt),
  model_attachment: Schema.optional(ModelAttachment),
})

export const Info = RawInfo.pipe(
  withStatics((s) => ({
    zod: zod(s).meta({ ref: "ComputerUseConfig" }) as unknown as z.ZodType<DeepMutable<Schema.Schema.Type<typeof s>>>,
  })),
)

export type Info = DeepMutable<Schema.Schema.Type<typeof Info>>

export type Backend = "native"

export type EffectiveConfig = ReturnType<typeof effectiveConfig>

export function effectiveBackend(info: Info | undefined): Backend {
  return info?.backend ?? "native"
}

export function toPolicyConfig(info: Info | undefined): ComputerUsePolicyConfig | undefined {
  return {
    enabled: true,
    app_denylist: info?.app_denylist,
    artifact_retention_ms: info?.artifact_retention_ms,
    model_attachment: info?.model_attachment,
  }
}

export function effectiveConfig(info: Info | undefined) {
  const policy = normalizeConfig(toPolicyConfig(info))
  return {
    ...policy,
    backend: effectiveBackend(info),
    max_artifact_bytes: info?.max_artifact_bytes,
    max_session_artifact_bytes: info?.max_session_artifact_bytes,
    max_global_artifact_bytes: info?.max_global_artifact_bytes,
  }
}

export function exposure(info: Info | undefined) {
  const effective = effectiveConfig(info)
  return {
    enabled: effective.enabled,
    exposeTools: effective.enabled,
    backend: effective.backend,
    reason: effective.enabled ? undefined : "feature_disabled",
  }
}

export * as ConfigComputerUse from "./computer-use"
