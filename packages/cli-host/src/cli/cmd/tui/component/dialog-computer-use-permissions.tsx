import open from "open"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useToast } from "@tui/ui/toast"
import { Clipboard } from "@tui/util/clipboard"
import { Process } from "@/util/process"

type PermissionKind = "accessibility" | "screenRecording"
type PermissionAction = "guided-setup" | "open-pane" | "reveal-helper" | "copy-helper" | "steps"

const PRIVACY_PANES: Record<PermissionKind, string> = {
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  screenRecording: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
}

const PERMISSION_LABELS: Record<PermissionKind, string> = {
  accessibility: "Accessibility",
  screenRecording: "Screen Recording",
}

export function DialogComputerUsePermissions(props: { permission: PermissionKind }) {
  const dialog = useDialog()
  const toast = useToast()
  const helperPath = process.env.INTERBASE_COMPUTER_USE_HELPER_PATH || "native/macos/InterbaseComputerUseHelper.app"
  const label = PERMISSION_LABELS[props.permission]

  async function openGuidedSetup() {
    await startComputerUsePermissionGuide(props.permission)
    toast.show({ variant: "info", message: `${label} setup opened` })
  }

  async function openPrivacyPane() {
    await open(PRIVACY_PANES[props.permission]).catch(() => {
      toast.show({ variant: "error", message: `Failed to open ${label} settings` })
    })
  }

  async function revealHelper() {
    await Process.run(["open", "-R", helperPath], { nothrow: true })
    toast.show({ variant: "info", message: "Helper app revealed in Finder" })
  }

  async function copyHelperPath() {
    await Clipboard.copy(helperPath)
    toast.show({ variant: "success", message: "Helper path copied" })
  }

  function showSteps() {
    dialog.replace(() => <ComputerUsePermissionSteps permission={props.permission} helperPath={helperPath} />)
  }

  return (
    <DialogSelect<PermissionAction>
      title={`Grant ${label}`}
      flat={true}
      options={[
        {
          value: "guided-setup",
          title: "Open guided setup",
          description: "Ask the helper app to open settings and show the drag-to-add window",
          onSelect: () => void openGuidedSetup(),
        },
        {
          value: "open-pane",
          title: `Open ${label} settings`,
          description: "Open the macOS Privacy pane for this permission",
          onSelect: () => void openPrivacyPane(),
        },
        {
          value: "reveal-helper",
          title: "Reveal helper app",
          description: "Show InterbaseComputerUseHelper.app in Finder so you can add it",
          onSelect: () => void revealHelper(),
        },
        {
          value: "copy-helper",
          title: "Copy helper path",
          description: "Copy the helper app path for manual selection",
          onSelect: () => void copyHelperPath(),
        },
        {
          value: "steps",
          title: "Show steps",
          description: "Explain what to add and when to restart",
          onSelect: () => showSteps(),
        },
      ]}
    />
  )
}

function ComputerUsePermissionSteps(props: { permission: PermissionKind; helperPath: string }) {
  const dialog = useDialog()
  const label = PERMISSION_LABELS[props.permission]

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text>{`Grant ${label}`}</text>
        <text onMouseUp={() => dialog.clear()}>esc</text>
      </box>
      <text>{`1. Open System Settings > Privacy & Security > ${label}.`}</text>
      <text>2. Click +, then add the helper app below.</text>
      <text>{props.helperPath}</text>
      <text>3. If macOS lists Terminal, interbase, or bun instead, enable that entry too.</text>
      <text>4. Restart Interbase, then retry @computer.</text>
    </box>
  )
}

export async function startComputerUsePermissionGuide(permission: PermissionKind) {
  const helperPath = process.env.INTERBASE_COMPUTER_USE_HELPER_PATH || "native/macos/InterbaseComputerUseHelper.app"
  await Process.run(["open", "-n", helperPath, "--args", "--permission-guide", permission], { nothrow: true })
}

export function missingComputerUsePermissionReason(reason: unknown): PermissionKind | undefined {
  if (typeof reason !== "string") return undefined
  if (reason.includes("missing_accessibility_permission")) return "accessibility"
  if (reason.includes("unknown_accessibility_permission")) return "accessibility"
  if (reason.includes("missing_screenRecording_permission")) return "screenRecording"
  if (reason.includes("unknown_screenRecording_permission")) return "screenRecording"
}
