import { createMemo } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useToast } from "@tui/ui/toast"

type ComputerUseAction = "on" | "off" | "native"

export function DialogComputerUse() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()

  const current = createMemo(() => {
    const config = (sync.data.config as { computer_use?: { enabled?: boolean; backend?: string } }).computer_use
    if (config?.enabled === false) return "off"
    if (config?.enabled === true && (config.backend ?? "native") === "native") return "native"
    return config?.enabled ? "on" : "off"
  })

  async function update(action: ComputerUseAction) {
    const current = await sdk.client.global.config.get()
    const existing = (current.data as { computer_use?: { enabled?: boolean; backend?: "native" } } | undefined)?.computer_use ?? {}
    const computer_use =
      action === "off"
        ? { ...existing, enabled: false }
        : { ...existing, enabled: true, backend: action === "native" ? ("native" as const) : (existing.backend ?? "native") }

    const result = await sdk.client.global.config.update({
      config: { computer_use } as NonNullable<Parameters<typeof sdk.client.global.config.update>[0]>["config"],
    })
    if (result.error) {
      toast.show({ variant: "error", message: "Failed to update computer-use settings" })
      return
    }

    toast.show({
      variant: "success",
      message: action === "off" ? "Computer use disabled" : "Computer use enabled",
    })
    dialog.clear()
  }

  return (
    <DialogSelect<ComputerUseAction>
      title="Computer use"
      flat={true}
      current={current()}
      options={[
        {
          value: "native",
          title: "Enable native backend",
          description: "Use native desktop computer-use tools",
          onSelect: () => void update("native"),
        },
        {
          value: "on",
          title: "Enable",
          description: "Use the configured computer-use backend",
          onSelect: () => void update("on"),
        },
        {
          value: "off",
          title: "Disable",
          description: "Turn off computer-use tools",
          onSelect: () => void update("off"),
        },
      ]}
    />
  )
}
