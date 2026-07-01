export const PROTOCOL_VERSION = "0.1.0"
export const PROTOCOL_MAJOR = 0
export const MAX_IPC_ENVELOPE_BYTES = 1024 * 1024
export const MAX_AX_PAYLOAD_BYTES = 512 * 1024

export type AppRef = {
  name: string
  bundleId?: string
  path?: string
  pid?: number
  signing?: {
    teamId?: string
    signingIdentifier?: string
    codeSignatureValid?: boolean
  }
}

export type WindowRef = {
  id: string
  title?: string
  bounds?: Rect
  visible?: boolean
}

export type Rect = {
  x: number
  y: number
  width: number
  height: number
  space?: CoordinateSpace
}

export type CoordinateSpace = "desktopLogical" | "windowLogical" | "screenshotPixel"
export type Point = { x: number; y: number; space?: CoordinateSpace }

export type ScreenshotGeometry = {
  pixelWidth: number
  pixelHeight: number
  scale: number
  desktopOrigin: { x: number; y: number }
  cropOrigin?: { x: number; y: number }
}

export type DisplayGeometry = {
  id: string
  bounds: Rect
  scale: number
  primary?: boolean
}

export type ElementRef = {
  id: string
  role: string
  depth?: number
  label?: string
  text?: string
  secure?: boolean
  bounds?: Rect
}

export type ElementSelector = {
  elementId?: string
  role?: string
  label?: string
  text?: string
}

export type ArtifactHandle = {
  id: string
  kind: "screenshot"
  mimeType: "image/png"
  expiresAt: string
  geometry?: ScreenshotGeometry
}

export type Observation = {
  id: string
  protocolVersion: string
  createdAt: string
  app: AppRef
  window?: WindowRef
  screenshot?: ArtifactHandle
  elements: ElementRef[]
  warnings: string[]
  promptInjectionWarning: string
  redaction: RedactionSummary
}

export type RedactionSummary = {
  secureFieldsRedacted: number
  textFieldsRedacted: number
  screenshotAvailableToModel: boolean
  axTextAvailableToModel: "none" | "redacted_summary"
}

export type ObserveRequest = {
  target?: {
    app?: Partial<AppRef>
    windowId?: string
  }
  includeScreenshot?: boolean
  includeAXTree?: boolean
  maxTreeDepth?: number
  maxNodeCount?: number
}

export type ActionRequest = {
  id: string
  observationId: string
  app: AppRef
  windowId?: string
  action:
    | { type: "click" | "doubleClick"; elementId?: string; point?: Point }
    | { type: "movePointer"; point: Point }
    | { type: "drag"; from: Point; to: Point }
    | { type: "scroll"; deltaX?: number; deltaY: number }
    | { type: "typeText"; text: string; secureField?: boolean }
    | { type: "keyChord"; keys: string[] }
    | { type: "clickElement"; selector: ElementSelector }
    | { type: "focusElement"; selector: ElementSelector }
    | { type: "setElementValue"; selector: ElementSelector; value: string; secureField?: boolean }
    | { type: "focusWindow"; windowId: string }
    | { type: "selectMenuItem" | "openContextMenu"; selector: ElementSelector }
    | { type: "focusApp" | "launchApp" }
    | { type: "fileDialog"; operation: "selectFile" | "saveFile"; artifactId?: string }
}

export type ActionResult = {
  id: string
  status: "performed" | "denied"
  reason?: string
  app: AppRef
  windowId?: string
  warnings: string[]
}

export type ArtifactReadRequest = {
  id: string
}

export type ArtifactReadResult = {
  id: string
  mimeType: "image/png"
  dataBase64: string
}

export type BackendPlatform = "macos" | "windows" | "linux" | "mock"
export type DriverKind = BackendPlatform
export type DriverCapability = "status" | "observe" | "act" | "screenshot" | "artifact" | "axTree" | "semanticActions"
export type OsPermission = "accessibility" | "screenRecording"
export type OsPermissionGrant = "granted" | "missing" | "unknown"
export type OsPermissionState = Record<OsPermission, OsPermissionGrant>

export type BackendDescriptor = {
  platform: BackendPlatform
  minProtocolMajor: number
  maxProtocolMajor: number
  capabilities: DriverCapability[]
  limitations: string[]
}

export type DriverHealth = {
  protocolMajor: number
  driver: DriverKind
  version: string
  capabilities: DriverCapability[]
}

export const BACKEND_DESCRIPTORS: Record<BackendPlatform, BackendDescriptor> = {
  macos: {
    platform: "macos",
    minProtocolMajor: PROTOCOL_MAJOR,
    maxProtocolMajor: PROTOCOL_MAJOR,
    capabilities: ["status", "observe", "act", "screenshot", "artifact", "axTree", "semanticActions"],
    limitations: ["requires Accessibility permission", "requires Screen Recording permission"],
  },
  windows: {
    platform: "windows",
    minProtocolMajor: PROTOCOL_MAJOR,
    maxProtocolMajor: PROTOCOL_MAJOR,
    capabilities: ["status", "observe"],
    limitations: ["future UI Automation backend", "not implemented in current host"],
  },
  linux: {
    platform: "linux",
    minProtocolMajor: PROTOCOL_MAJOR,
    maxProtocolMajor: PROTOCOL_MAJOR,
    capabilities: ["status"],
    limitations: ["desktop automation support depends on compositor", "not implemented in current host"],
  },
  mock: {
    platform: "mock",
    minProtocolMajor: PROTOCOL_MAJOR,
    maxProtocolMajor: PROTOCOL_MAJOR,
    capabilities: ["status", "observe", "act"],
    limitations: ["test-only backend; no native OS events are emitted"],
  },
}

const ACTION_TYPES = new Set<ActionRequest["action"]["type"]>([
  "click",
  "doubleClick",
  "movePointer",
  "drag",
  "scroll",
  "typeText",
  "keyChord",
  "clickElement",
  "focusElement",
  "setElementValue",
  "focusWindow",
  "selectMenuItem",
  "openContextMenu",
  "focusApp",
  "launchApp",
  "fileDialog",
])

const FILE_DIALOG_OPERATIONS = new Set(["selectFile", "saveFile"])

export type DriverAuthenticity =
  | { trusted: true; reason: "mock_driver" | "verified_signature"; detail?: string }
  | { trusted: false; reason: "untrusted_path" | "checksum_mismatch" | "signature_invalid" | "team_id_mismatch"; detail?: string }

export type DriverStatus = {
  available: boolean
  crashed: boolean
  health?: DriverHealth
  authenticity: DriverAuthenticity
  permissionState: OsPermissionState
  missingPermissions: OsPermission[]
}

export type IpcEnvelope<T = unknown> = {
  id: string
  method: string
  protocolMajor: number
  payload: T
}

export type DriverMethod = "health" | "status" | "observe" | "act" | "artifact" | "cancel" | "shutdown"
export type DriverRequest<T = unknown> = {
  id: string
  method: DriverMethod
  params: T
  deadlineMs?: number
}
export type DriverResponse<T = unknown> = {
  id: string
  result?: T
  error?: { code: string; message: string }
}
export const DRIVER_METHODS: DriverMethod[] = ["health", "status", "observe", "act", "artifact", "cancel", "shutdown"]

export class ComputerUseProtocolError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "ComputerUseProtocolError"
    this.code = code
  }
}

export function makeElementId(input: { app: AppRef; windowId?: string; role: string; index: number }) {
  const appKey = input.app.bundleId ?? input.app.path ?? input.app.name
  return ["el", stablePart(appKey), stablePart(input.windowId ?? "window"), stablePart(input.role), input.index].join(":")
}

export function rectToDesktopLogical(rect: Rect, context: { windowOrigin?: Point; screenshot?: ScreenshotGeometry } = {}): Rect {
  const point = pointToDesktopLogical({ x: rect.x, y: rect.y, space: rect.space }, context)
  const size = rect.space === "screenshotPixel" ? { width: rect.width / screenshotScale(context), height: rect.height / screenshotScale(context) } : { width: rect.width, height: rect.height }
  return { x: point.x, y: point.y, width: size.width, height: size.height, space: "desktopLogical" }
}

export function pointToDesktopLogical(point: Point, context: { windowOrigin?: Point; screenshot?: ScreenshotGeometry } = {}): Point {
  const space = point.space ?? "desktopLogical"
  if (space === "desktopLogical") return { x: point.x, y: point.y, space: "desktopLogical" }
  if (space === "windowLogical") {
    if (!context.windowOrigin) throw new ComputerUseProtocolError("missing_window_origin", "Window-relative coordinate requires window origin")
    return { x: context.windowOrigin.x + point.x, y: context.windowOrigin.y + point.y, space: "desktopLogical" }
  }
  if (!context.screenshot) throw new ComputerUseProtocolError("missing_screenshot_geometry", "Screenshot-pixel coordinate requires screenshot geometry")
  const crop = context.screenshot.cropOrigin ?? { x: 0, y: 0 }
  return {
    x: context.screenshot.desktopOrigin.x + crop.x + point.x / context.screenshot.scale,
    y: context.screenshot.desktopOrigin.y + crop.y + point.y / context.screenshot.scale,
    space: "desktopLogical",
  }
}

export function normalizeActionPoint(request: ActionRequest, context: { windowOrigin?: Point; screenshot?: ScreenshotGeometry } = {}): ActionRequest {
  if (request.action.type === "drag") {
    return { ...request, action: { ...request.action, from: pointToDesktopLogical(request.action.from, context), to: pointToDesktopLogical(request.action.to, context) } }
  }
  if ((request.action.type !== "click" && request.action.type !== "doubleClick" && request.action.type !== "movePointer") || !request.action.point) return request
  return { ...request, action: { ...request.action, point: pointToDesktopLogical(request.action.point, context) } }
}

export function displayContainingPoint(point: Point, displays: DisplayGeometry[]): DisplayGeometry {
  if (displays.length === 0) throw new ComputerUseProtocolError("missing_display_geometry", "At least one display geometry is required")
  const desktopPoint = point.space === "desktopLogical" || point.space === undefined ? point : pointToDesktopLogical(point)
  return displays.find((display) => rectContainsPoint(display.bounds, desktopPoint)) ?? nearestDisplay(desktopPoint, displays)
}

export function clampPointToDisplay(point: Point, display: DisplayGeometry): Point {
  const bounds = display.bounds
  return {
    x: Math.min(Math.max(point.x, bounds.x), bounds.x + bounds.width),
    y: Math.min(Math.max(point.y, bounds.y), bounds.y + bounds.height),
    space: "desktopLogical",
  }
}

export function screenshotGeometryForDisplay(display: DisplayGeometry): ScreenshotGeometry {
  return {
    pixelWidth: Math.round(display.bounds.width * display.scale),
    pixelHeight: Math.round(display.bounds.height * display.scale),
    scale: display.scale,
    desktopOrigin: { x: display.bounds.x, y: display.bounds.y },
  }
}

export function encodeEnvelope<T>(envelope: IpcEnvelope<T>) {
  if (envelope.protocolMajor !== PROTOCOL_MAJOR) {
    throw new ComputerUseProtocolError("unsupported_protocol", "IPC envelope protocol major is not supported")
  }
  const encoded = JSON.stringify(envelope)
  if (Buffer.byteLength(encoded, "utf8") > MAX_IPC_ENVELOPE_BYTES) {
    throw new ComputerUseProtocolError("envelope_too_large", "IPC envelope exceeds the maximum size")
  }
  return `${encoded}\n`
}

export function decodeEnvelope(input: string): IpcEnvelope {
  if (!input.endsWith("\n")) {
    throw new ComputerUseProtocolError("invalid_frame", "IPC envelope must be newline framed")
  }
  if (Buffer.byteLength(input, "utf8") > MAX_IPC_ENVELOPE_BYTES) {
    throw new ComputerUseProtocolError("envelope_too_large", "IPC envelope exceeds the maximum size")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    throw new ComputerUseProtocolError("invalid_json", "IPC envelope is not valid JSON")
  }
  if (!isEnvelope(parsed)) {
    throw new ComputerUseProtocolError("invalid_envelope", "IPC envelope is missing required fields")
  }
  if (parsed.protocolMajor !== PROTOCOL_MAJOR) {
    throw new ComputerUseProtocolError("unsupported_protocol", "IPC envelope protocol major is not supported")
  }
  return parsed
}

export function makeDriverRequest<T>(input: DriverRequest<T>): IpcEnvelope<DriverRequest<T>> {
  validateDriverRequest(input)
  return { id: input.id, method: input.method, protocolMajor: PROTOCOL_MAJOR, payload: input }
}

export function validateDriverRequest<T>(request: DriverRequest<T>): DriverRequest<T> {
  if (!request.id) throw new ComputerUseProtocolError("invalid_request", "Driver request requires id")
  if (!DRIVER_METHODS.includes(request.method)) throw new ComputerUseProtocolError("unknown_method", "Driver request method is not supported")
  if (request.deadlineMs !== undefined && (!Number.isInteger(request.deadlineMs) || request.deadlineMs <= 0)) {
    throw new ComputerUseProtocolError("invalid_deadline", "Driver request deadline must be a positive integer")
  }
  return request
}

export function validateDriverResponse<T>(response: DriverResponse<T>): DriverResponse<T> {
  if (!response.id) throw new ComputerUseProtocolError("invalid_response", "Driver response requires id")
  if (response.result !== undefined && response.error !== undefined) {
    throw new ComputerUseProtocolError("invalid_response", "Driver response cannot contain both result and error")
  }
  if (response.result === undefined && response.error === undefined) {
    throw new ComputerUseProtocolError("invalid_response", "Driver response requires result or error")
  }
  if (response.error && (!response.error.code || !response.error.message)) {
    throw new ComputerUseProtocolError("invalid_response", "Driver response error requires code and message")
  }
  return response
}

export function validateDriverHealth(health: DriverHealth): DriverHealth {
  if (health.protocolMajor !== PROTOCOL_MAJOR) {
    throw new ComputerUseProtocolError("unsupported_protocol", "Driver protocol major is not supported")
  }
  if (health.capabilities.length === 0) {
    throw new ComputerUseProtocolError("missing_capabilities", "Driver did not advertise any capabilities")
  }
  const descriptor = BACKEND_DESCRIPTORS[health.driver]
  if (!descriptor) {
    throw new ComputerUseProtocolError("unsupported_backend", "Driver backend is not supported")
  }
  if (!health.capabilities.every((capability) => descriptor.capabilities.includes(capability))) {
    throw new ComputerUseProtocolError("unsupported_capability", "Driver advertised unsupported capabilities for its backend")
  }
  return health
}

export function backendSupports(platform: BackendPlatform, capability: DriverCapability) {
  return BACKEND_DESCRIPTORS[platform].capabilities.includes(capability)
}

export function describeBackendLimitations(platform: BackendPlatform) {
  return [...BACKEND_DESCRIPTORS[platform].limitations]
}

export function permissionStateFromMissing(missingPermissions: OsPermission[], unknownPermissions: OsPermission[] = []): OsPermissionState {
  return {
    accessibility: permissionGrant("accessibility", missingPermissions, unknownPermissions),
    screenRecording: permissionGrant("screenRecording", missingPermissions, unknownPermissions),
  }
}

export function missingPermissionsFromState(state: OsPermissionState): OsPermission[] {
  return OS_PERMISSIONS.filter((permission) => state[permission] === "missing")
}

export function hasRequiredPermissions(state: OsPermissionState, required: OsPermission[]) {
  return required.every((permission) => state[permission] === "granted")
}

export function assertTrustedDriver(status: DriverStatus): DriverStatus {
  if (!status.available) {
    throw new ComputerUseProtocolError("driver_unavailable", "Computer-use driver is unavailable")
  }
  if (status.crashed) {
    throw new ComputerUseProtocolError("driver_crashed", "Computer-use driver has crashed")
  }
  if (!status.authenticity.trusted) {
    throw new ComputerUseProtocolError("driver_untrusted", `Computer-use driver is not trusted: ${status.authenticity.reason}`)
  }
  if (!status.health) {
    throw new ComputerUseProtocolError("missing_health", "Computer-use driver did not provide health metadata")
  }
  validateDriverHealth(status.health)
  return status
}

export function validateObserveRequest(request: ObserveRequest): ObserveRequest {
  if (request.target?.app && !hasAppIdentity(request.target.app)) {
    throw new ComputerUseProtocolError("invalid_observe", "Observe target app requires at least one identity field")
  }
  if (request.target?.windowId !== undefined && request.target.windowId.length === 0) {
    throw new ComputerUseProtocolError("invalid_observe", "Observe target windowId must be non-empty")
  }
  if (request.maxTreeDepth !== undefined && !isPositiveInteger(request.maxTreeDepth)) {
    throw new ComputerUseProtocolError("invalid_observe", "Observe maxTreeDepth must be a positive integer")
  }
  if (request.maxNodeCount !== undefined && !isPositiveInteger(request.maxNodeCount)) {
    throw new ComputerUseProtocolError("invalid_observe", "Observe maxNodeCount must be a positive integer")
  }
  return request
}

export function validateObservation(observation: Observation): Observation {
  if (!observation.id) throw new ComputerUseProtocolError("invalid_observation", "Observation requires id")
  if (observation.protocolVersion !== PROTOCOL_VERSION) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation protocolVersion is not supported")
  }
  if (!isIsoDate(observation.createdAt)) throw new ComputerUseProtocolError("invalid_observation", "Observation createdAt must be ISO timestamp")
  validateAppRef(observation.app, "invalid_observation", "Observation")
  if (observation.window) validateWindowRef(observation.window)
  if (observation.screenshot) validateArtifactHandle(observation.screenshot)
  if (!Array.isArray(observation.elements)) throw new ComputerUseProtocolError("invalid_observation", "Observation elements must be an array")
  for (const element of observation.elements) validateElementRef(element)
  if (Buffer.byteLength(JSON.stringify(observation.elements), "utf8") > MAX_AX_PAYLOAD_BYTES) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation AX payload exceeds maximum size")
  }
  if (!Array.isArray(observation.warnings)) throw new ComputerUseProtocolError("invalid_observation", "Observation warnings must be an array")
  if (!isRedactionSummary(observation.redaction)) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation redaction summary is invalid")
  }
  return observation
}

export function validateActionRequest(request: ActionRequest): ActionRequest {
  if (!request.id || !request.observationId) {
    throw new ComputerUseProtocolError("invalid_action", "Action request requires id and observationId")
  }
  validateAppRef(request.app, "invalid_action", "Action request")
  if (!ACTION_TYPES.has(request.action.type)) {
    throw new ComputerUseProtocolError("invalid_action", "Action request type is not supported")
  }
  if ((request.action.type === "click" || request.action.type === "doubleClick") && !request.action.elementId && !request.action.point) {
    throw new ComputerUseProtocolError("invalid_action", "Pointer action requires elementId or point")
  }
  if (request.action.type === "movePointer" && !request.action.point) {
    throw new ComputerUseProtocolError("invalid_action", "Move-pointer action requires point")
  }
  if (request.action.type === "drag" && (!request.action.from || !request.action.to)) {
    throw new ComputerUseProtocolError("invalid_action", "Drag action requires from and to points")
  }
  if (isCoordinatePointerAction(request.action) && request.action.point && !request.windowId) {
    throw new ComputerUseProtocolError("invalid_action", "Coordinate pointer action requires windowId context")
  }
  if (isCoordinatePointerAction(request.action) && request.action.point && request.action.point.space === undefined) {
    throw new ComputerUseProtocolError("invalid_action", "Coordinate pointer action requires coordinate space")
  }
  if (request.action.type === "drag" && !request.windowId) {
    throw new ComputerUseProtocolError("invalid_action", "Coordinate pointer action requires windowId context")
  }
  if (request.action.type === "drag" && (request.action.from.space === undefined || request.action.to.space === undefined)) {
    throw new ComputerUseProtocolError("invalid_action", "Coordinate pointer action requires coordinate space")
  }
  if (request.action.type === "scroll" && request.action.deltaY === 0 && (request.action.deltaX ?? 0) === 0) {
    throw new ComputerUseProtocolError("invalid_action", "Scroll action requires non-zero delta")
  }
  if (request.action.type === "typeText" && request.action.text.length === 0) {
    throw new ComputerUseProtocolError("invalid_action", "Type action requires non-empty text")
  }
  if (request.action.type === "keyChord" && request.action.keys.length === 0) {
    throw new ComputerUseProtocolError("invalid_action", "Key chord action requires keys")
  }
  if (request.action.type === "clickElement" || request.action.type === "focusElement" || request.action.type === "selectMenuItem" || request.action.type === "openContextMenu") validateElementSelector(request.action.selector)
  if (request.action.type === "setElementValue") {
    validateElementSelector(request.action.selector)
    if (request.action.value.length === 0) throw new ComputerUseProtocolError("invalid_action", "Set-value action requires non-empty value")
    if (request.action.secureField) throw new ComputerUseProtocolError("invalid_action", "Set-value action cannot target secure fields")
  }
  if (request.action.type === "focusWindow" && request.action.windowId.length === 0) {
    throw new ComputerUseProtocolError("invalid_action", "Focus-window action requires windowId")
  }
  if (request.action.type === "fileDialog") {
    if (!FILE_DIALOG_OPERATIONS.has(request.action.operation)) {
      throw new ComputerUseProtocolError("invalid_action", "File-dialog action operation is not supported")
    }
    if (request.action.artifactId !== undefined && request.action.artifactId.length === 0) {
      throw new ComputerUseProtocolError("invalid_action", "File-dialog action artifactId cannot be empty")
    }
  }
  return request
}

function isCoordinatePointerAction(action: ActionRequest["action"]): action is Extract<ActionRequest["action"], { point?: Point }> {
  return action.type === "click" || action.type === "doubleClick" || action.type === "movePointer"
}

export function validateArtifactReadRequest(request: ArtifactReadRequest): ArtifactReadRequest {
  if (!request.id) throw new ComputerUseProtocolError("invalid_artifact", "Artifact read request requires id")
  return request
}

export function validateArtifactReadResult(result: ArtifactReadResult): ArtifactReadResult {
  if (!result.id) throw new ComputerUseProtocolError("invalid_artifact", "Artifact read result requires id")
  if (result.mimeType !== "image/png") throw new ComputerUseProtocolError("invalid_artifact", "Artifact read result mimeType is unsupported")
  if (!isBase64(result.dataBase64)) throw new ComputerUseProtocolError("invalid_artifact", "Artifact read result data must be base64")
  return result
}

export function resolveElement(observation: Observation, selector: ElementSelector): ElementRef {
  validateElementSelector(selector)
  const matches = observation.elements.filter((element) => matchesElementSelector(element, selector))
  if (matches.length === 0) throw new ComputerUseProtocolError("stale_element", "Semantic element target was not found in the latest observation")
  if (matches.length > 1) throw new ComputerUseProtocolError("ambiguous_element", "Semantic element target matched multiple elements")
  const [element] = matches
  if (element.secure) throw new ComputerUseProtocolError("secure_element", "Semantic element target is a secure field")
  return element
}

export function resolveSemanticActionTarget(request: ActionRequest, observation: Observation): ActionRequest {
  validateActionRequest(request)
  if (request.action.type === "clickElement" || request.action.type === "focusElement" || request.action.type === "selectMenuItem") {
    const element = resolveElement(observation, request.action.selector)
    return { ...request, action: { type: "click", elementId: element.id } }
  }
  if (request.action.type === "setElementValue") {
    resolveElement(observation, request.action.selector)
    return { ...request, action: { type: "typeText", text: request.action.value } }
  }
  if (request.action.type === "openContextMenu") {
    resolveElement(observation, request.action.selector)
    return request
  }
  if (request.action.type === "focusWindow") {
    if (observation.window?.id !== request.action.windowId) {
      throw new ComputerUseProtocolError("stale_window", "Semantic window target is not the active observed window")
    }
    return { ...request, windowId: request.action.windowId, action: { type: "keyChord", keys: ["Meta", "Tab"] } }
  }
  return request
}

function isEnvelope(input: unknown): input is IpcEnvelope {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as IpcEnvelope).id === "string" &&
    typeof (input as IpcEnvelope).method === "string" &&
    typeof (input as IpcEnvelope).protocolMajor === "number" &&
    "payload" in input
  )
}

function stablePart(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9._-]+/g, "-").replaceAll(/^-|-$/g, "") || "unknown"
}

function validateElementSelector(selector: ElementSelector) {
  if (!selector.elementId && !selector.role && !selector.label && !selector.text) {
    throw new ComputerUseProtocolError("invalid_selector", "Element selector requires at least one criterion")
  }
}

function validateWindowRef(window: WindowRef) {
  if (!window.id) throw new ComputerUseProtocolError("invalid_observation", "Observation window requires id")
  if (window.bounds) validateRect(window.bounds)
  if (window.visible !== undefined && typeof window.visible !== "boolean") throw new ComputerUseProtocolError("invalid_observation", "Observation window visible flag must be boolean")
}

function validateArtifactHandle(handle: ArtifactHandle) {
  if (!handle.id) throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot requires artifact id")
  if (handle.kind !== "screenshot" || handle.mimeType !== "image/png") {
    throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot artifact type is unsupported")
  }
  if (!isIsoDate(handle.expiresAt)) throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot expiresAt must be ISO timestamp")
  if (handle.geometry) validateScreenshotGeometry(handle.geometry)
}

function validateElementRef(element: ElementRef) {
  if (!element.id || !element.role) throw new ComputerUseProtocolError("invalid_observation", "Observation element requires id and role")
  if (element.depth !== undefined && (!Number.isInteger(element.depth) || element.depth < 0)) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation element depth must be a non-negative integer")
  }
  if (element.bounds) validateRect(element.bounds)
}

function validateRect(rect: Rect) {
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width < 0 || rect.height < 0) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation rectangle must contain finite non-negative size")
  }
}

function validateScreenshotGeometry(geometry: ScreenshotGeometry) {
  if (![geometry.pixelWidth, geometry.pixelHeight, geometry.scale, geometry.desktopOrigin.x, geometry.desktopOrigin.y].every(Number.isFinite)) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot geometry must contain finite numbers")
  }
  if (geometry.pixelWidth <= 0 || geometry.pixelHeight <= 0 || geometry.scale <= 0) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot geometry dimensions must be positive")
  }
  if (geometry.cropOrigin && ![geometry.cropOrigin.x, geometry.cropOrigin.y].every(Number.isFinite)) {
    throw new ComputerUseProtocolError("invalid_observation", "Observation screenshot crop origin must contain finite numbers")
  }
}

function isRedactionSummary(redaction: RedactionSummary | undefined) {
  if (!redaction) return false
  return (
    Number.isInteger(redaction.secureFieldsRedacted) &&
    redaction.secureFieldsRedacted >= 0 &&
    Number.isInteger(redaction.textFieldsRedacted) &&
    redaction.textFieldsRedacted >= 0 &&
    typeof redaction.screenshotAvailableToModel === "boolean" &&
    (redaction.axTextAvailableToModel === "none" || redaction.axTextAvailableToModel === "redacted_summary")
  )
}

function isBase64(value: string) {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

function hasAppIdentity(app: Partial<AppRef>) {
  return Boolean(app.name || app.bundleId || app.path || app.pid !== undefined)
}

function validateAppRef(app: AppRef, code: ComputerUseProtocolError["code"], label: string) {
  if (!app.name) throw new ComputerUseProtocolError(code, `${label} requires app identity`)
  if (app.signing === undefined) return
  const signing = app.signing as Record<string, unknown>
  if (signing.teamId !== undefined && typeof signing.teamId !== "string") {
    throw new ComputerUseProtocolError(code, `${label} app signing teamId must be a string`)
  }
  if (signing.signingIdentifier !== undefined && typeof signing.signingIdentifier !== "string") {
    throw new ComputerUseProtocolError(code, `${label} app signingIdentifier must be a string`)
  }
  if (signing.codeSignatureValid !== undefined && typeof signing.codeSignatureValid !== "boolean") {
    throw new ComputerUseProtocolError(code, `${label} app codeSignatureValid must be a boolean`)
  }
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0
}

function isIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value
}

function matchesElementSelector(element: ElementRef, selector: ElementSelector) {
  return (
    (selector.elementId === undefined || element.id === selector.elementId) &&
    (selector.role === undefined || element.role === selector.role) &&
    (selector.label === undefined || element.label === selector.label) &&
    (selector.text === undefined || element.text === selector.text)
  )
}

function rectContainsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

function nearestDisplay(point: Point, displays: DisplayGeometry[]) {
  return displays.reduce((nearest, display) => {
    const current = distanceToRect(point, display.bounds)
    const best = distanceToRect(point, nearest.bounds)
    if (current !== best) return current < best ? display : nearest
    return display.primary === true && nearest.primary !== true ? display : nearest
  }, displays[0]!)
}

function distanceToRect(point: Point, rect: Rect) {
  const dx = point.x < rect.x ? rect.x - point.x : point.x > rect.x + rect.width ? point.x - (rect.x + rect.width) : 0
  const dy = point.y < rect.y ? rect.y - point.y : point.y > rect.y + rect.height ? point.y - (rect.y + rect.height) : 0
  return dx * dx + dy * dy
}

const OS_PERMISSIONS: OsPermission[] = ["accessibility", "screenRecording"]

function permissionGrant(permission: OsPermission, missingPermissions: OsPermission[], unknownPermissions: OsPermission[]): OsPermissionGrant {
  if (unknownPermissions.includes(permission)) return "unknown"
  if (missingPermissions.includes(permission)) return "missing"
  return "granted"
}

function screenshotScale(context: { screenshot?: ScreenshotGeometry }) {
  if (!context.screenshot) throw new ComputerUseProtocolError("missing_screenshot_geometry", "Screenshot-pixel coordinate requires screenshot geometry")
  return context.screenshot.scale
}
