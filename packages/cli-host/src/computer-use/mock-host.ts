import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"
import type { ComputerUsePolicyConfig } from "@interbase/computer-use-policy"
import type { ObserveRequest } from "@interbase/computer-use-protocol"

export function observeMockComputer(request: ObserveRequest, config: ComputerUsePolicyConfig | undefined) {
  const observation = makeSanitizedMockObservation(config)
  const elements = request.includeAXTree === false
    ? []
    : observation.elements.filter((element) => (element.depth ?? 0) <= maxTreeDepth(request.maxTreeDepth)).slice(0, maxNodeCount(request.maxNodeCount, observation.elements.length))
  return {
    ...observation,
    elements,
    screenshot: request.includeScreenshot === false ? undefined : observation.screenshot,
    redaction: {
      ...observation.redaction,
      axTextAvailableToModel: request.includeAXTree === false ? "none" : observation.redaction.axTextAvailableToModel,
    },
  }
}

function maxNodeCount(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 0) return 0
  return value
}

function maxTreeDepth(value: number | undefined) {
  if (value === undefined) return Number.POSITIVE_INFINITY
  if (!Number.isInteger(value) || value < 0) return 0
  return value
}
