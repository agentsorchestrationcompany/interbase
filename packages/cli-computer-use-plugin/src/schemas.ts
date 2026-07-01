import { z } from "zod"

export const AppRefSchema = z.object({
  name: z.string(),
  bundleId: z.string().optional(),
  path: z.string().optional(),
})

export const TargetSchema = z.object({
  app: z
    .object({
      name: z.string().optional(),
      bundleId: z.string().optional(),
      path: z.string().optional(),
    })
    .optional(),
  windowId: z.string().optional(),
})

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
  space: z.enum(["desktopLogical", "windowLogical", "screenshotPixel"]),
})

export const ElementSelectorSchema = z.object({
  elementId: z.string().optional(),
  role: z.string().optional(),
  label: z.string().optional(),
  text: z.string().optional(),
})

export const ObserveArgsSchema = z.object({
  target: TargetSchema.optional(),
  includeScreenshot: z.boolean().optional(),
  includeAXTree: z.boolean().optional(),
  maxTreeDepth: z.number().optional(),
  maxNodeCount: z.number().optional(),
})

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), elementId: z.string().optional(), point: PointSchema.optional() }),
  z.object({ type: z.literal("doubleClick"), elementId: z.string().optional(), point: PointSchema.optional() }),
  z.object({ type: z.literal("movePointer"), point: PointSchema }),
  z.object({ type: z.literal("drag"), from: PointSchema, to: PointSchema }),
  z.object({ type: z.literal("scroll"), deltaX: z.number().optional(), deltaY: z.number() }),
  z.object({ type: z.literal("typeText"), text: z.string(), secureField: z.boolean().optional() }),
  z.object({ type: z.literal("keyChord"), keys: z.array(z.string()) }),
  z.object({ type: z.literal("clickElement"), selector: ElementSelectorSchema }),
  z.object({ type: z.literal("focusElement"), selector: ElementSelectorSchema }),
  z.object({ type: z.literal("setElementValue"), selector: ElementSelectorSchema, value: z.string(), secureField: z.boolean().optional() }),
  z.object({ type: z.literal("focusWindow"), windowId: z.string() }),
  z.object({ type: z.literal("focusApp") }),
  z.object({ type: z.literal("launchApp") }),
  z.object({ type: z.literal("selectMenuItem"), selector: ElementSelectorSchema }),
  z.object({ type: z.literal("openContextMenu"), selector: ElementSelectorSchema }),
  z.object({ type: z.literal("fileDialog"), operation: z.enum(["selectFile", "saveFile"]), artifactId: z.string().optional() }),
])

export const ActArgsSchema = z.object({
  actionId: z.string(),
  observationId: z.string(),
  app: AppRefSchema,
  windowId: z.string().optional(),
  action: ActionSchema,
})

export const WaitForArgsSchema = z.object({
  target: TargetSchema.optional(),
  condition: z.object({
    elementId: z.string().optional(),
    text: z.string().optional(),
    label: z.string().optional(),
  }),
  maxAttempts: z.number().optional(),
})

export type ObserveArgs = z.infer<typeof ObserveArgsSchema>
export type ActArgs = z.infer<typeof ActArgsSchema>
export type WaitForArgs = z.infer<typeof WaitForArgsSchema>
