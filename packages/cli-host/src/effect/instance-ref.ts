import { Context } from "effect"
import type { InstanceContext } from "@/project/instance"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~interbase/InstanceRef", {
  defaultValue: () => undefined,
})
