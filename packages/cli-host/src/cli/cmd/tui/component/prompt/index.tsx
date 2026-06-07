import { BoxRenderable, RGBA, TextareaRenderable, MouseEvent, PasteEvent, decodePasteBytes } from "@opentui/core"
import { createEffect, createMemo, onMount, createSignal, onCleanup, on, Show, Switch, Match, For } from "solid-js"
import "opentui-spinner/solid"
import path from "path"
import { fileURLToPath } from "url"
import { Filesystem } from "@/util/filesystem"
import { useLocal } from "@tui/context/local"
import { tint, useTheme } from "@tui/context/theme"
import { AsciiBorderFrame } from "@tui/component/border"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useEvent } from "@tui/context/event"
import { editorSelectionKey, useEditorContext, type EditorSelection } from "@tui/context/editor"
import { MessageID, PartID } from "@/session/schema"
import { createStore, produce, unwrap } from "solid-js/store"
import { useKeybind } from "@tui/context/keybind"
import { usePromptHistory, type PromptInfo } from "./history"
import { computePromptTraits } from "./traits"
import { assign, reconcileVirtualParts } from "./part"
import { usePromptStash } from "./stash"
import { DialogStash } from "../dialog-stash"
import { type AutocompleteRef, Autocomplete } from "./autocomplete"
import { useCommandDialog } from "../dialog-command"
import { useRenderer, useTerminalDimensions, type JSX } from "@opentui/solid"
import * as Editor from "@tui/util/editor"
import { useExit } from "../../context/exit"
import * as Clipboard from "../../util/clipboard"
import type { FilePart, UserMessage } from "@interbase/sdk/v2"
import { TuiEvent } from "../../event"
import { iife } from "@/util/iife"
import { Locale } from "@/util/locale"
import { formatDuration } from "@/util/format"
import { useDialog } from "@tui/ui/dialog"
import { DialogProvider as DialogProviderConnect } from "../dialog-provider"
import { DialogAlert } from "../../ui/dialog-alert"
import { useToast } from "../../ui/toast"
import { useKV } from "../../context/kv"
import { createFadeIn } from "../../util/signal"
import { useTextInputMousePointer } from "../../util/text-input-mouse-pointer"
import { useTextareaKeybindings } from "../textarea-keybindings"
import { DialogSkill } from "../dialog-skill"
import { useArgs } from "@tui/context/args"
import { useDirectory } from "../../context/directory"
import { resolvePromptSlashCommand, resolvePromptSlashCommandAction } from "./slash-command"
import { goalCommandBypassesPromptQueue, goalCommandInterruptsTurn } from "@interbase/cli-goal-plugin/tui-queue"
import { resolvePromptAlias } from "@interbase/cli-aliases-plugin"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { CliTelemetryEntrypoint, CliTelemetryEvent } from "@interbase/cli-telemetry"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"
import { readGoalCommandTurnState } from "@/session/goal-store"
import {
  canDrainQueuedSubmission,
  queuedSubmissionPreviewTextForSubmission,
  requestForSubmission,
  shouldQueueSubmission,
  statusClearsPendingStart,
} from "./submission-queue"

export type PromptProps = {
  sessionID?: string
  visible?: boolean
  disabled?: boolean
  showFooter?: boolean
  onSubmit?: () => void
  onInterruptChange?: (count: number) => void
  ref?: (ref: PromptRef | undefined) => void
  hint?: JSX.Element
  right?: JSX.Element
  footerStatus?: JSX.Element | (() => JSX.Element | null)
  showPlaceholder?: boolean
  inputPlaceholder?: string
  placeholders?: {
    normal?: string[]
    shell?: string[]
  }
}

export type PromptRef = {
  focused: boolean
  current: PromptInfo
  set(prompt: PromptInfo): void
  reset(): void
  blur(): void
  focus(): void
  submit(): void
}

function renderFooterStatus(status: PromptProps["footerStatus"]) {
  if (typeof status === "function") return status()
  return status
}

const workingFooterFrames = [
  "░░░░░░",
  "░░░░░░",
  "░░░░░░",
  "░░░░░░",
  "▓░░░░░",
  "▒▓░░░░",
  "░▒▓░░░",
  "░░▒▓░░",
  "░░░▒▓░",
  "░░░░▒▓",
  "░░░░░▒",
]

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function randomIndex(count: number) {
  if (count <= 0) return 0
  return Math.floor(Math.random() * count)
}

function fadeColor(color: RGBA, alpha: number) {
  return RGBA.fromValues(color.r, color.g, color.b, color.a * alpha)
}

function hasEditorRangeSelection(selection: EditorSelection["ranges"][number]) {
  return (
    selection.selection.start.line !== selection.selection.end.line ||
    selection.selection.start.character !== selection.selection.end.character
  )
}

function getEditorRangeLabel(selection: EditorSelection["ranges"][number]) {
  if (!hasEditorRangeSelection(selection)) return
  if (selection.selection.start.line === selection.selection.end.line) return `#${selection.selection.start.line}`
  return `#${selection.selection.start.line}-${selection.selection.end.line}`
}

function formatEditorContext(selection: EditorSelection) {
  const selected = selection.ranges.filter(hasEditorRangeSelection)
  if (selected.length === 0)
    return `<system-reminder>Note: The user opened the file "${selection.filePath}". This may or may not be relevant to the current task.</system-reminder>\n`

  const ranges = selected.map((range, index) => {
    const prefix = selected.length > 1 ? `Selection ${index + 1}: ` : ""
    return `Note: The user selected ${prefix}${getEditorRangeLabel(range)} from "${selection.filePath}". \`\`\`${range.text}\`\`\`\n\n`
  })

  return `<system-reminder>${ranges.join("\n")} This may or may not be relevant to the current task.</system-reminder>\n`
}

let stashed: { prompt: PromptInfo; cursor: number } | undefined

export function Prompt(props: PromptProps) {
  let input: TextareaRenderable
  let anchor: BoxRenderable
  let autocomplete: AutocompleteRef

  const keybind = useKeybind()
  const local = useLocal()
  const args = useArgs()
  const sdk = useSDK()
  const editor = useEditorContext()
  const route = useRoute()
  const sync = useSync()
  const directory = useDirectory()
  const dialog = useDialog()
  const toast = useToast()
  const status = createMemo(() => sync.data.session_status?.[props.sessionID ?? ""] ?? { type: "idle" })
  type PromptRequest = Parameters<typeof sdk.client.session.prompt>[0]
  type CommandRequest = Parameters<typeof sdk.client.session.command>[0]
  type ShellRequest = Parameters<typeof sdk.client.session.shell>[0]
  type QueuedSubmission =
    | {
        type: "prompt"
        displayText?: string
        request: PromptRequest
        history: PromptInfo
        submittedEditorSelectionKey?: string
      }
    | {
        type: "command"
        displayText?: string
        request: CommandRequest
        history: PromptInfo
      }
    | {
        type: "shell"
        request: ShellRequest
        history: PromptInfo
      }
  const history = usePromptHistory()
  const stash = usePromptStash()
  const command = useCommandDialog()
  const renderer = useRenderer()
  const dimensions = useTerminalDimensions()
  const { theme, syntax } = useTheme()
  const textInputMousePointer = useTextInputMousePointer()
  const kv = useKV()
  const animationsEnabled = createMemo(() => kv.get("animations_enabled", true))
  const list = createMemo(() => props.placeholders?.normal ?? [])
  const shell = createMemo(() => props.placeholders?.shell ?? [])
  const fileContextEnabled = createMemo(() => kv.get("file_context_enabled", true))
  const [dismissedEditorSelectionKey, setDismissedEditorSelectionKey] = createSignal<string>()
  const [queuedSubmissions, setQueuedSubmissions] = createSignal<QueuedSubmission[]>([])
  const [queuedSubmissionPendingStart, setQueuedSubmissionPendingStart] = createSignal(false)
  const editorContext = createMemo(() => {
    const selection = fileContextEnabled() ? editor.selection() : undefined
    if (!selection) return
    return editorSelectionKey(selection) === dismissedEditorSelectionKey() ? undefined : selection
  })
  const editorPath = createMemo(() => editorContext()?.filePath)
  const editorSelectionLabel = createMemo(() => {
    const ranges = editorContext()?.ranges
    if (!ranges) return
    const first = ranges.find(hasEditorRangeSelection) ?? ranges[0]
    if (!first) return
    return [getEditorRangeLabel(first), ranges.length > 1 ? `+${ranges.length - 1}` : undefined]
      .filter(Boolean)
      .join(" ")
  })
  const editorFileLabel = createMemo(() => {
    const value = editorPath()
    if (!value) return
    const filename = path.basename(value)
    const file = /^index\.[^./]+$/.test(filename)
      ? [path.basename(path.dirname(value)), filename].filter(Boolean).join("/")
      : filename
    return `${file.split(path.sep).join("/")}${editorSelectionLabel() ?? ""}`
  })
  const editorFileLabelDisplay = createMemo(() => {
    const file = editorFileLabel()
    if (!file) return
    return Locale.truncateMiddle(file, Math.max(12, Math.min(48, Math.floor(dimensions().width / 3))))
  })
  const [editorContextHover, setEditorContextHover] = createSignal(false)
  let lastSubmittedEditorSelectionKey: string | undefined
  const [auto, setAuto] = createSignal<AutocompleteRef>()
  const currentProviderLabel = createMemo(() => local.model.parsed().provider)
  const hasRightContent = createMemo(() => Boolean(props.right))

  function promptModelWarning() {
    toast.show({
      variant: "warning",
      message: "Connect a provider to send prompts",
      duration: 3000,
    })
    if (sync.data.provider.length === 0) {
      dialog.replace(() => <DialogProviderConnect />)
    }
  }

  function dismissEditorContext() {
    setDismissedEditorSelectionKey(editorSelectionKey(editorContext()))
    editor.clearSelection()
  }

  function sendSubmission(submission: QueuedSubmission, queued: boolean) {
    history.append(submission.history)
    if (submission.type === "shell") {
      void sdk.client.session
        .shell(requestForSubmission(submission, { queued, messageID: MessageID.ascending }) as ShellRequest)
        .finally(() => {
          if (queued) setQueuedSubmissionPendingStart(false)
        })
      return
    }
    if (submission.type === "command") {
      void sdk.client.session
        .command(requestForSubmission(submission, { queued, messageID: MessageID.ascending }) as CommandRequest)
        .finally(() => {
          if (queued) setQueuedSubmissionPendingStart(false)
        })
      if (
        !queued &&
        props.sessionID &&
        status().type !== "idle" &&
        goalCommandInterruptsTurn(
          {
            command: submission.request.command,
            arguments: submission.request.arguments,
          },
          readGoalCommandTurnState({ sessionID: props.sessionID }),
        )
      ) {
        void sdk.client.session.abort({ sessionID: props.sessionID }).catch(() => {})
      }
      return
    }
    void sdk.client.session
      .prompt(requestForSubmission(submission, { queued, messageID: MessageID.ascending }) as PromptRequest)
      .then(() => {
        lastSubmittedEditorSelectionKey = submission.submittedEditorSelectionKey
      })
      .finally(() => {
        if (queued) setQueuedSubmissionPendingStart(false)
      })
  }

  createEffect(() => {
    const currentStatus = status()
    if (statusClearsPendingStart(currentStatus)) {
      if (queuedSubmissionPendingStart()) setQueuedSubmissionPendingStart(false)
      return
    }
    if (
      !canDrainQueuedSubmission({
        disabled: props.disabled,
        pendingStart: queuedSubmissionPendingStart(),
        queueLength: queuedSubmissions().length,
        status: currentStatus,
      })
    )
      return
    const next = queuedSubmissions()[0]
    if (!next) return
    setQueuedSubmissions((queue) => queue.slice(1))
    setQueuedSubmissionPendingStart(true)
    sendSubmission(next, true)
  })

  const textareaKeybindings = useTextareaKeybindings()

  const fileStyleId = syntax().getStyleId("extmark.file")!
  const agentStyleId = syntax().getStyleId("extmark.agent")!
  const pasteStyleId = syntax().getStyleId("extmark.paste")!
  let promptPartTypeId = 0
  const event = useEvent()

  event.on(TuiEvent.PromptAppend.type, (evt) => {
    if (!input || input.isDestroyed) return
    input.insertText(evt.properties.text)
    setTimeout(() => {
      // setTimeout is a workaround and needs to be addressed properly
      if (!input || input.isDestroyed) return
      input.getLayoutNode().markDirty()
      input.gotoBufferEnd()
      renderer.requestRender()
    }, 0)
  })

  createEffect(() => {
    if (props.disabled) input.cursorColor = theme.backgroundElement
    if (!props.disabled) input.cursorColor = theme.text
  })

  const lastUserMessage = createMemo(() => {
    if (!props.sessionID) return undefined
    const messages = sync.data.message[props.sessionID]
    if (!messages) return undefined
    return messages.findLast((m): m is UserMessage => {
      if (m.role !== "user") return false
      const parts = sync.data.part[m.id] ?? []
      return parts.some((part) => part.type === "text" && !part.synthetic && !part.ignored)
    })
  })

  const usage = createMemo(() => {
    if (!props.sessionID) return
    const msg = sync.data.message[props.sessionID] ?? []
    const cost = msg.reduce((sum, item) => sum + (item.role === "assistant" ? item.cost : 0), 0)
    if (cost <= 0) return
    return money.format(cost)
  })

  const [store, setStore] = createStore<{
    prompt: PromptInfo
    mode: "normal" | "shell"
    extmarkToPartIndex: Map<number, number>
    interrupt: number
    placeholder: number
  }>({
    placeholder: randomIndex(list().length),
    prompt: {
      input: "",
      parts: [],
    },
    mode: "normal",
    extmarkToPartIndex: new Map(),
    interrupt: 0,
  })
  const hasFooterContentAfterModelMeta = createMemo(() => {
    if (store.mode !== "normal") return false
    return Boolean(editorFileLabelDisplay() || usage() || directory() || props.right)
  })

  const interruptSession = () => {
    if (autocomplete.visible) return
    if (!input.focused) return
    // TODO: this should be its own command
    if (store.mode === "shell") {
      setStore("mode", "normal")
      return
    }
    if (!props.sessionID) return

    setStore("interrupt", store.interrupt + 1)

    setTimeout(() => {
      setStore("interrupt", 0)
    }, 5000)

    if (store.interrupt >= 2) {
      void sdk.client.session.abort({
        sessionID: props.sessionID,
      })
      setStore("interrupt", 0)
    }
  }

  createEffect(
    on(
      () => props.sessionID,
      () => {
        setStore("placeholder", randomIndex(list().length))
      },
      { defer: true },
    ),
  )

  createEffect(() => {
    props.onInterruptChange?.(store.interrupt)
  })

  // Initialize agent/model/variant from last user message when session changes
  let syncedSessionID: string | undefined
  createEffect(() => {
    const sessionID = props.sessionID
    const msg = lastUserMessage()

    if (sessionID !== syncedSessionID) {
      if (!sessionID || !msg) return

      syncedSessionID = sessionID

      // Only set agent if it's a primary agent (not a subagent)
      const isPrimaryAgent = local.agent.list().some((x) => x.name === msg.agent)
      if (msg.agent && isPrimaryAgent) {
        // Keep command line --agent if specified.
        if (!args.agent) local.agent.set(msg.agent)
        const persistedModel = sync.session.get(sessionID)?.model
        if (msg.model && !persistedModel) {
          local.model.set(msg.model, { persist: false })
        }
      }
    }
  })

  command.register(() => {
    return [
      {
        title: "Clear prompt",
        value: "prompt.clear",
        category: "Prompt",
        hidden: true,
        onSelect: (dialog) => {
          input.extmarks.clear()
          input.clear()
          dialog.clear()
        },
      },
      {
        title: "Submit prompt",
        value: "prompt.submit",
        keybind: "input_submit",
        category: "Prompt",
        hidden: true,
        onSelect: async (dialog) => {
          if (!input.focused) return
          const handled = await submit()
          if (!handled) return

          dialog.clear()
        },
      },
      {
        title: "Remove editor context",
        value: "prompt.editor_context.clear",
        category: "Prompt",
        enabled: Boolean(editorContext()),
        onSelect: (dialog) => {
          dismissEditorContext()
          dialog.clear()
        },
      },
      {
        title: "Paste",
        value: "prompt.paste",
        keybind: "input_paste",
        category: "Prompt",
        hidden: true,
        onSelect: async () => {
          const content = await Clipboard.read()
          if (content?.mime.startsWith("image/")) {
            await pasteAttachment({
              filename: "clipboard",
              mime: content.mime,
              content: content.data,
            })
          }
        },
      },
      {
        title: "Interrupt session",
        value: "session.interrupt",
        keybind: "session_interrupt",
        category: "Session",
        hidden: true,
        enabled: status().type !== "idle",
        onSelect: (dialog) => {
          interruptSession()
          dialog.clear()
        },
      },
      {
        title: "Open editor",
        category: "Session",
        keybind: "editor_open",
        value: "prompt.editor",
        slash: {
          name: "editor",
        },
        onSelect: async (dialog) => {
          dialog.clear()

          // replace summarized text parts with the actual text
          const text = store.prompt.parts
            .filter((p) => p.type === "text")
            .reduce((acc, p) => {
              if (!p.source) return acc
              return acc.replace(p.source.text.value, p.text)
            }, store.prompt.input)

          const nonTextParts = store.prompt.parts.filter((p) => p.type !== "text")

          const value = text
          const content = await Editor.open({ value, renderer })
          if (!content) return

          input.setText(content)

          // Update positions for nonTextParts based on their location in new content
          // Filter out parts whose virtual text was deleted
          // this handles a case where the user edits the text in the editor
          // such that the virtual text moves around or is deleted
          const updatedNonTextParts = nonTextParts
            .map((part) => {
              let virtualText = ""
              if (part.type === "file" && part.source?.text) {
                virtualText = part.source.text.value
              } else if (part.type === "agent" && part.source) {
                virtualText = part.source.value
              }

              if (!virtualText) return part

              const newStart = content.indexOf(virtualText)
              // if the virtual text is deleted, remove the part
              if (newStart === -1) return null

              const newEnd = newStart + virtualText.length

              if (part.type === "file" && part.source?.text) {
                return {
                  ...part,
                  source: {
                    ...part.source,
                    text: {
                      ...part.source.text,
                      start: newStart,
                      end: newEnd,
                    },
                  },
                }
              }

              if (part.type === "agent" && part.source) {
                return {
                  ...part,
                  source: {
                    ...part.source,
                    start: newStart,
                    end: newEnd,
                  },
                }
              }

              return part
            })
            .filter((part) => part !== null)

          setStore("prompt", {
            input: content,
            // keep only the non-text parts because the text parts were
            // already expanded inline
            parts: updatedNonTextParts,
          })
          restoreExtmarksFromParts(updatedNonTextParts)
          input.cursorOffset = Bun.stringWidth(content)
        },
      },
      {
        title: "Skills",
        value: "prompt.skills",
        category: "Prompt",
        slash: {
          name: "skills",
        },
        onSelect: () => {
          dialog.replace(() => (
            <DialogSkill
              onSelect={(skill) => {
                input.setText(`/${skill} `)
                setStore("prompt", {
                  input: `/${skill} `,
                  parts: [],
                })
                input.gotoBufferEnd()
              }}
            />
          ))
        },
      },
    ]
  })

  const ref: PromptRef = {
    get focused() {
      return input.focused
    },
    get current() {
      return store.prompt
    },
    focus() {
      input.focus()
    },
    blur() {
      input.blur()
    },
    set(prompt) {
      input.setText(prompt.input)
      setStore("prompt", prompt)
      restoreExtmarksFromParts(prompt.parts)
      input.gotoBufferEnd()
    },
    reset() {
      input.clear()
      input.extmarks.clear()
      setStore("prompt", {
        input: "",
        parts: [],
      })
      setStore("extmarkToPartIndex", new Map())
    },
    submit() {
      void submit()
    },
  }

  onMount(() => {
    const saved = stashed
    stashed = undefined
    if (store.prompt.input) return
    if (saved && saved.prompt.input) {
      input.setText(saved.prompt.input)
      setStore("prompt", saved.prompt)
      restoreExtmarksFromParts(saved.prompt.parts)
      input.cursorOffset = saved.cursor
    }
  })

  onCleanup(() => {
    if (store.prompt.input) {
      stashed = { prompt: unwrap(store.prompt), cursor: input.cursorOffset }
    }
    props.ref?.(undefined)
  })

  createEffect(() => {
    if (!input || input.isDestroyed) return
    if (props.visible === false || dialog.stack.length > 0) {
      if (input.focused) input.blur()
      return
    }

    // Slot/plugin updates can remount the background prompt while a dialog is open.
    // Keep focus with the dialog and let the prompt reclaim it after the dialog closes.
    if (!input.focused) input.focus()
  })

  createEffect(() => {
    if (!input || input.isDestroyed) return
    input.traits = computePromptTraits({
      mode: store.mode,
      disabled: !!props.disabled,
      autocompleteVisible: !!auto()?.visible,
    })
  })

  function restoreExtmarksFromParts(parts: PromptInfo["parts"]) {
    input.extmarks.clear()
    setStore("extmarkToPartIndex", new Map())

    parts.forEach((part, partIndex) => {
      let start = 0
      let end = 0
      let virtualText = ""
      let styleId: number | undefined

      if (part.type === "file" && part.source?.text) {
        start = part.source.text.start
        end = part.source.text.end
        virtualText = part.source.text.value
        styleId = fileStyleId
      } else if (part.type === "agent" && part.source) {
        start = part.source.start
        end = part.source.end
        virtualText = part.source.value
        styleId = agentStyleId
      } else if (part.type === "text" && part.source?.text) {
        start = part.source.text.start
        end = part.source.text.end
        virtualText = part.source.text.value
        styleId = pasteStyleId
      }

      if (virtualText) {
        const extmarkId = input.extmarks.create({
          start,
          end,
          virtual: true,
          styleId,
          typeId: promptPartTypeId,
        })
        setStore("extmarkToPartIndex", (map: Map<number, number>) => {
          const newMap = new Map(map)
          newMap.set(extmarkId, partIndex)
          return newMap
        })
      }
    })
  }

  function syncExtmarksWithPromptParts() {
    const allExtmarks = input.extmarks.getAllForTypeId(promptPartTypeId)
    setStore(
      produce((draft) => {
        const newMap = new Map<number, number>()
        const newParts: typeof draft.prompt.parts = []

        for (const extmark of allExtmarks) {
          const partIndex = draft.extmarkToPartIndex.get(extmark.id)
          if (partIndex !== undefined) {
            const part = draft.prompt.parts[partIndex]
            if (part) {
              if (part.type === "agent" && part.source) {
                part.source.start = extmark.start
                part.source.end = extmark.end
              } else if (part.type === "file" && part.source?.text) {
                part.source.text.start = extmark.start
                part.source.text.end = extmark.end
              } else if (part.type === "text" && part.source?.text) {
                part.source.text.start = extmark.start
                part.source.text.end = extmark.end
              }
              newMap.set(extmark.id, newParts.length)
              newParts.push(part)
            }
          }
        }

        draft.extmarkToPartIndex = newMap
        draft.prompt.parts = newParts
      }),
    )
  }

  command.register(() => [
    {
      title: "Stash prompt",
      value: "prompt.stash",
      category: "Prompt",
      enabled: !!store.prompt.input,
      onSelect: (dialog) => {
        if (!store.prompt.input) return
        stash.push({
          input: store.prompt.input,
          parts: store.prompt.parts,
        })
        input.extmarks.clear()
        input.clear()
        setStore("prompt", { input: "", parts: [] })
        setStore("extmarkToPartIndex", new Map())
        dialog.clear()
      },
    },
    {
      title: "Stash pop",
      value: "prompt.stash.pop",
      category: "Prompt",
      enabled: stash.list().length > 0,
      onSelect: (dialog) => {
        const entry = stash.pop()
        if (entry) {
          input.setText(entry.input)
          setStore("prompt", { input: entry.input, parts: entry.parts })
          restoreExtmarksFromParts(entry.parts)
          input.gotoBufferEnd()
        }
        dialog.clear()
      },
    },
    {
      title: "Stash list",
      value: "prompt.stash.list",
      category: "Prompt",
      enabled: stash.list().length > 0,
      onSelect: (dialog) => {
        dialog.replace(() => (
          <DialogStash
            onSelect={(entry) => {
              input.setText(entry.input)
              setStore("prompt", { input: entry.input, parts: entry.parts })
              restoreExtmarksFromParts(entry.parts)
              input.gotoBufferEnd()
            }}
          />
        ))
      },
    },
  ])

  async function submit() {
    // IME: double-defer may fire before onContentChange flushes the last
    // composed character (e.g. Korean hangul) to the store, so read
    // plainText directly and sync before any downstream reads.
    if (input && !input.isDestroyed && input.plainText !== store.prompt.input) {
      setStore("prompt", "input", input.plainText)
      syncExtmarksWithPromptParts()
    }
    if (props.disabled) return false
    if (autocomplete?.visible) return false
    if (!store.prompt.input) return false
    const agent = local.agent.current()
    if (!agent) return false
    const trimmed = store.prompt.input.trim()
    if (trimmed === "exit" || trimmed === "quit" || trimmed === ":q") {
      void exit()
      return true
    }
    const slashAction = resolvePromptSlashCommandAction({
      inputText: store.prompt.input,
      tuiSlashCommands: command.slashes(),
    })
    if (slashAction) {
      input.extmarks.clear()
      input.clear()
      setStore("prompt", {
        input: "",
        parts: [],
      })
      setStore("extmarkToPartIndex", new Map())
      props.onSubmit?.()
      slashAction()
      return true
    }
    const selectedModel = local.model.current()
    if (!selectedModel) {
      void promptModelWarning()
      return false
    }

    const variant = local.model.variant.current()
    let sessionID = props.sessionID
    if (sessionID == null) {
      const res = await sdk.client.session.create({
        agent: agent.name,
        model: {
          providerID: selectedModel.providerID,
          id: selectedModel.modelID,
          variant,
        },
      })

      if (res.error) {
        console.log("Creating a session failed:", res.error)

        toast.show({
          message: "Creating a session failed. Open console for more details.",
          variant: "error",
        })

        return true
      }

      sessionID = res.data.id
    }

    const messageID = MessageID.ascending()
    const submittedPrompt = structuredClone(unwrap(store.prompt))
    const currentMode = store.mode
    const promptAlias = resolvePromptAlias({
      inputText: submittedPrompt.input,
      stateDirectory: interbaseRuntimeContext.paths.state,
    })
    if (promptAlias) emitCliBehaviorTelemetry(CliTelemetryEvent.AliasExpanded, CliTelemetryEntrypoint.Tui)
    let inputText = promptAlias?.prompt ?? submittedPrompt.input

    // Expand pasted text inline before submitting
    const allExtmarks = input.extmarks.getAllForTypeId(promptPartTypeId)
    const sortedExtmarks = allExtmarks.sort((a: { start: number }, b: { start: number }) => b.start - a.start)

    for (const extmark of sortedExtmarks) {
      const partIndex = store.extmarkToPartIndex.get(extmark.id)
      if (partIndex !== undefined) {
        const part = submittedPrompt.parts[partIndex]
        if (part?.type === "text" && part.text) {
          const before = inputText.slice(0, extmark.start)
          const after = inputText.slice(extmark.end)
          inputText = before + part.text + after
        }
      }
    }

    // Filter out text parts (pasted content) since they're now expanded inline
    const nonTextParts = submittedPrompt.parts.filter((part) => part.type !== "text")

    // Capture mode before it gets reset
    const historyPrompt: PromptInfo = {
      ...submittedPrompt,
      mode: currentMode,
    }

    const editorSelection = editorContext()
    const currentEditorSelectionKey = editorSelectionKey(editorSelection)
    const editorParts =
      editorSelection && currentEditorSelectionKey !== lastSubmittedEditorSelectionKey
        ? [
            {
              id: PartID.ascending(),
              type: "text" as const,
              text: formatEditorContext(editorSelection),
              synthetic: true,
              metadata: {
                kind: "editor_context",
                source: editorSelection.source ?? "editor",
                filePath: editorSelection.filePath,
                ranges: editorSelection.ranges,
              },
            },
          ]
        : []

    let submission: QueuedSubmission
    if (currentMode === "shell") {
      submission = {
        type: "shell",
        history: historyPrompt,
        request: {
          sessionID,
          agent: agent.name,
          model: {
            providerID: selectedModel.providerID,
            modelID: selectedModel.modelID,
          },
          command: inputText,
        },
      }
      setStore("mode", "normal")
    } else {
      const slashCommand = resolvePromptSlashCommand({
        inputText,
        serverCommands: sync.data.command,
        tuiSlashCommands: command.slashes(),
      })
      if (slashCommand) {
        submission = {
          type: "command",
          ...(promptAlias ? { displayText: promptAlias.prompt } : {}),
          history: historyPrompt,
          request: {
            sessionID,
            command: slashCommand.command,
            arguments: slashCommand.arguments,
            agent: agent.name,
            model: `${selectedModel.providerID}/${selectedModel.modelID}`,
            messageID,
            variant,
            parts: nonTextParts
              .filter((x) => x.type === "file")
              .map((x) => ({
                id: PartID.ascending(),
                ...x,
              })),
          },
        }
      } else {
        submission = {
          type: "prompt",
          ...(promptAlias ? { displayText: promptAlias.prompt } : {}),
          history: historyPrompt,
          submittedEditorSelectionKey: currentEditorSelectionKey,
          request: {
            sessionID,
            ...selectedModel,
            messageID,
            agent: agent.name,
            model: selectedModel,
            variant,
            parts: [
              ...editorParts,
              {
                id: PartID.ascending(),
                type: "text",
                text: inputText,
              },
              ...nonTextParts.map(assign),
            ],
          },
        }
      }
    }

    const shouldQueue = shouldQueueSubmission({
      hasSession: Boolean(props.sessionID),
      pendingStart: queuedSubmissionPendingStart(),
      status: status(),
      bypassQueue:
        submission.type === "command" &&
        goalCommandBypassesPromptQueue({
          command: submission.request.command,
          arguments: submission.request.arguments,
        }),
    })
    if (shouldQueue) {
      setQueuedSubmissions((queue) => [...queue, submission])
    } else {
      sendSubmission(submission, false)
    }

    input.extmarks.clear()
    setStore("prompt", {
      input: "",
      parts: [],
    })
    setStore("extmarkToPartIndex", new Map())
    props.onSubmit?.()

    // temporary hack to make sure the message is sent
    if (!props.sessionID)
      setTimeout(() => {
        route.navigate({
          type: "session",
          sessionID,
        })
      }, 50)
    input.clear()
    return true
  }
  const exit = useExit()

  function pasteText(text: string, virtualText: string) {
    const currentOffset = input.visualCursor.offset
    const extmarkStart = currentOffset
    const extmarkEnd = extmarkStart + virtualText.length

    input.insertText(virtualText + " ")

    const extmarkId = input.extmarks.create({
      start: extmarkStart,
      end: extmarkEnd,
      virtual: true,
      styleId: pasteStyleId,
      typeId: promptPartTypeId,
    })

    setStore(
      produce((draft) => {
        const partIndex = draft.prompt.parts.length
        draft.prompt.parts.push({
          type: "text" as const,
          text,
          source: {
            text: {
              start: extmarkStart,
              end: extmarkEnd,
              value: virtualText,
            },
          },
        })
        draft.extmarkToPartIndex.set(extmarkId, partIndex)
      }),
    )
  }

  async function pasteAttachment(file: { filename?: string; filepath?: string; content: string; mime: string }) {
    const currentOffset = input.visualCursor.offset
    const extmarkStart = currentOffset
    const pdf = file.mime === "application/pdf"
    const count = store.prompt.parts.filter((x) => {
      if (x.type !== "file") return false
      if (pdf) return x.mime === "application/pdf"
      return x.mime.startsWith("image/")
    }).length
    const virtualText = pdf ? `[PDF ${count + 1}]` : `[Image ${count + 1}]`
    const extmarkEnd = extmarkStart + virtualText.length
    const textToInsert = virtualText + " "

    input.insertText(textToInsert)

    const extmarkId = input.extmarks.create({
      start: extmarkStart,
      end: extmarkEnd,
      virtual: true,
      styleId: pasteStyleId,
      typeId: promptPartTypeId,
    })

    const part: Omit<FilePart, "id" | "messageID" | "sessionID"> = {
      type: "file" as const,
      mime: file.mime,
      filename: file.filename,
      url: `data:${file.mime};base64,${file.content}`,
      source: {
        type: "file",
        path: file.filepath ?? file.filename ?? "",
        text: {
          start: extmarkStart,
          end: extmarkEnd,
          value: virtualText,
        },
      },
    }
    setStore(
      produce((draft) => {
        const partIndex = draft.prompt.parts.length
        draft.prompt.parts.push(part)
        draft.extmarkToPartIndex.set(extmarkId, partIndex)
      }),
    )
    return
  }

  const highlight = createMemo(() => {
    if (keybind.leader) return theme.border
    if (store.mode === "shell") return theme.primary
    const agent = local.agent.current()
    if (!agent) return theme.border
    return local.agent.color(agent.name)
  })

  const showVariant = createMemo(() => {
    const variants = local.model.variant.list()
    if (variants.length === 0) return false
    const current = local.model.variant.current()
    return !!current
  })
  const currentVariantLabel = createMemo(() => {
    const current = local.model.variant.current()
    if (!current) return ""
    return Locale.titlecase(current)
  })

  const agentMetaAlpha = createFadeIn(() => !!local.agent.current(), animationsEnabled)
  const modelMetaAlpha = createFadeIn(() => !!local.agent.current() && store.mode === "normal", animationsEnabled)
  const variantMetaAlpha = createFadeIn(
    () => !!local.agent.current() && store.mode === "normal" && showVariant(),
    animationsEnabled,
  )
  const borderHighlight = createMemo(() => tint(theme.border, highlight(), agentMetaAlpha()))

  const placeholderText = createMemo(() => {
    if (props.showPlaceholder === false) return undefined
    if (props.inputPlaceholder && store.mode === "normal") return props.inputPlaceholder
    if (store.mode === "shell") {
      if (!shell().length) return undefined
      const example = shell()[store.placeholder % shell().length]
      return `Run a command... "${example}"`
    }
    if (!list().length) return undefined
    return `Ask anything... "${list()[store.placeholder % list().length]}"`
  })
  const queuedSubmissionPreviews = createMemo(() =>
    queuedSubmissions()
      .map((submission) =>
        queuedSubmissionPreviewTextForSubmission({
          submission,
          maxWidth: Math.min(80, dimensions().width - 18),
        }),
      )
      .filter(Boolean),
  )

  const spinnerColor = createMemo(() => {
    const agent = local.agent.current()
    return agent ? local.agent.color(agent.name) : theme.border
  })

  return (
    <>
      <Autocomplete
        sessionID={props.sessionID}
        ref={(r) => {
          autocomplete = r
          setAuto(() => r)
        }}
        anchor={() => anchor}
        input={() => input}
        setPrompt={(cb) => {
          setStore("prompt", produce(cb))
        }}
        setExtmark={(partIndex, extmarkId) => {
          setStore("extmarkToPartIndex", (map: Map<number, number>) => {
            const newMap = new Map(map)
            newMap.set(extmarkId, partIndex)
            return newMap
          })
        }}
        value={store.prompt.input}
        fileStyleId={fileStyleId}
        agentStyleId={agentStyleId}
        promptPartTypeId={() => promptPartTypeId}
      />
      <box ref={(r) => (anchor = r)} visible={props.visible !== false}>
        <box {...AsciiBorderFrame} borderColor={borderHighlight()}>
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            flexShrink={0}
            backgroundColor={theme.backgroundElement}
            flexGrow={1}
          >
            <Show when={queuedSubmissionPreviews().length > 0}>
              <box flexDirection="column" flexShrink={0} paddingBottom={1} gap={1}>
                <For each={queuedSubmissionPreviews()}>
                  {(preview) => (
                    <text fg={theme.textMuted} wrapMode="none">
                      <span style={{ bg: highlight(), fg: theme.background, bold: true }}> QUEUED </span> {preview}
                    </text>
                  )}
                </For>
              </box>
            </Show>
            <textarea
              {...textInputMousePointer}
              placeholder={placeholderText()}
              placeholderColor={theme.textMuted}
              textColor={keybind.leader ? theme.textMuted : theme.text}
              focusedTextColor={keybind.leader ? theme.textMuted : theme.text}
              minHeight={1}
              maxHeight={6}
              onContentChange={() => {
                const value = input.plainText
                setStore("prompt", "input", value)
                autocomplete.onInput(value)
                syncExtmarksWithPromptParts()

                const parts = reconcileVirtualParts(unwrap(store.prompt).parts, value)
                if (parts.length !== store.prompt.parts.length) {
                  setStore("prompt", { input: value, parts })
                  restoreExtmarksFromParts(parts)
                }
              }}
              keyBindings={textareaKeybindings()}
              onKeyDown={async (e) => {
                if (props.disabled) {
                  e.preventDefault()
                  return
                }
                if (e.ctrl && e.name === "c" && status().type !== "idle") {
                  interruptSession()
                  e.preventDefault()
                  return
                }
                // Check clipboard for images before terminal-handled paste runs.
                // This helps terminals that forward Ctrl+V to the app; Windows
                // Terminal 1.25+ usually handles Ctrl+V before this path.
                if (keybind.match("input_paste", e)) {
                  const content = await Clipboard.read()
                  if (content?.mime.startsWith("image/")) {
                    e.preventDefault()
                    await pasteAttachment({
                      filename: "clipboard",
                      mime: content.mime,
                      content: content.data,
                    })
                    return
                  }
                  // If no image, let the default paste behavior continue
                }
                if (keybind.match("input_clear", e) && store.prompt.input !== "") {
                  input.clear()
                  input.extmarks.clear()
                  setStore("prompt", {
                    input: "",
                    parts: [],
                  })
                  setStore("extmarkToPartIndex", new Map())
                  return
                }
                if (keybind.match("app_exit", e)) {
                  if (store.prompt.input === "") {
                    await exit()
                    // Don't preventDefault - let textarea potentially handle the event
                    e.preventDefault()
                    return
                  }
                }
                if (e.name === "!" && input.visualCursor.offset === 0) {
                  setStore("placeholder", randomIndex(shell().length))
                  setStore("mode", "shell")
                  e.preventDefault()
                  return
                }
                if (store.mode === "shell") {
                  if ((e.name === "backspace" && input.visualCursor.offset === 0) || e.name === "escape") {
                    setStore("mode", "normal")
                    e.preventDefault()
                    return
                  }
                }
                if (store.mode === "normal") autocomplete.onKeyDown(e)
                if (!autocomplete.visible) {
                  if (
                    (keybind.match("history_previous", e) && input.cursorOffset === 0) ||
                    (keybind.match("history_next", e) && input.cursorOffset === input.plainText.length)
                  ) {
                    const direction = keybind.match("history_previous", e) ? -1 : 1
                    const item = history.move(direction, input.plainText)

                    if (item) {
                      input.setText(item.input)
                      setStore("prompt", item)
                      setStore("mode", item.mode ?? "normal")
                      restoreExtmarksFromParts(item.parts)
                      e.preventDefault()
                      if (direction === -1) input.cursorOffset = 0
                      if (direction === 1) input.cursorOffset = input.plainText.length
                    }
                    return
                  }

                  if (keybind.match("history_previous", e) && input.visualCursor.visualRow === 0) input.cursorOffset = 0
                  if (keybind.match("history_next", e) && input.visualCursor.visualRow === input.height - 1)
                    input.cursorOffset = input.plainText.length
                }
              }}
              onSubmit={() => {
                if (store.mode === "normal" && autocomplete.accept()) return
                // IME: double-defer so the last composed character (e.g. Korean
                // hangul) is flushed to plainText before we read it for submission.
                setTimeout(() => setTimeout(() => submit(), 0), 0)
              }}
              onPaste={async (event: PasteEvent) => {
                if (props.disabled) {
                  event.preventDefault()
                  return
                }

                // Normalize line endings at the boundary
                // Windows ConPTY/Terminal often sends CR-only newlines in bracketed paste
                // Replace CRLF first, then any remaining CR
                const normalizedText = decodePasteBytes(event.bytes).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
                const pastedContent = normalizedText.trim()

                // Windows Terminal <1.25 can surface image-only clipboard as an
                // empty bracketed paste. Windows Terminal 1.25+ does not.
                if (!pastedContent) {
                  command.trigger("prompt.paste")
                  return
                }

                // Once we cross an async boundary below, the terminal may perform its
                // default paste unless we suppress it first and handle insertion ourselves.
                event.preventDefault()

                const filepath = iife(() => {
                  const raw = pastedContent.replace(/^['"]+|['"]+$/g, "")
                  if (raw.startsWith("file://")) {
                    try {
                      return fileURLToPath(raw)
                    } catch {}
                  }
                  if (process.platform === "win32") return raw
                  return raw.replace(/\\(.)/g, "$1")
                })
                const isUrl = /^(https?):\/\//.test(filepath)
                if (!isUrl) {
                  try {
                    const mime = await Filesystem.mimeType(filepath)
                    const filename = path.basename(filepath)
                    // Handle SVG as raw text content, not as base64 image
                    if (mime === "image/svg+xml") {
                      const content = await Filesystem.readText(filepath).catch(() => {})
                      if (content) {
                        pasteText(content, `[SVG: ${filename ?? "image"}]`)
                        return
                      }
                    }
                    if (mime.startsWith("image/") || mime === "application/pdf") {
                      const content = await Filesystem.readArrayBuffer(filepath)
                        .then((buffer) => Buffer.from(buffer).toString("base64"))
                        .catch(() => {})
                      if (content) {
                        await pasteAttachment({
                          filename,
                          filepath,
                          mime,
                          content,
                        })
                        return
                      }
                    }
                  } catch {}
                }

                const lineCount = (pastedContent.match(/\n/g)?.length ?? 0) + 1
                if (
                  (lineCount >= 3 || pastedContent.length > 150) &&
                  kv.get("paste_summary_enabled", !sync.data.config.experimental?.disable_paste_summary)
                ) {
                  pasteText(pastedContent, `[Pasted ~${lineCount} lines]`)
                  return
                }

                input.insertText(normalizedText)

                // Force layout update and render for the pasted content
                setTimeout(() => {
                  // setTimeout is a workaround and needs to be addressed properly
                  if (!input || input.isDestroyed) return
                  input.getLayoutNode().markDirty()
                  renderer.requestRender()
                }, 0)
              }}
              ref={(r: TextareaRenderable) => {
                input = r
                if (promptPartTypeId === 0) {
                  promptPartTypeId = input.extmarks.registerType("prompt-part")
                }
                props.ref?.(ref)
                setTimeout(() => {
                  // setTimeout is a workaround and needs to be addressed properly
                  if (!input || input.isDestroyed) return
                  input.cursorColor = theme.text
                }, 0)
              }}
              onMouseDown={(r: MouseEvent) => r.target?.focus()}
              focusedBackgroundColor={theme.backgroundElement}
              cursorColor={theme.text}
              syntaxStyle={syntax()}
            />
            <Show when={props.showFooter === false && hasRightContent()}>
              <box flexDirection="row" flexShrink={0} paddingTop={1} justifyContent="flex-end">
                {props.right}
              </box>
            </Show>
          </box>
        </box>
        <Show when={props.showFooter !== false}>
          <box width="100%" flexDirection="row" justifyContent="space-between">
            <Show when={status().type !== "idle"} fallback={props.hint ?? <text />}>
              <box
                flexDirection="row"
                gap={1}
                flexGrow={1}
                justifyContent={status().type === "retry" ? "space-between" : "flex-start"}
              >
                <box flexShrink={0} flexDirection="row" gap={1}>
                  <box flexDirection="row" gap={1} flexShrink={0}>
                    <Show when={status().type === "busy"}>
                      <box flexDirection="row" gap={1} flexShrink={0} paddingLeft={3}>
                        <Show
                          when={animationsEnabled()}
                          fallback={
                            <text fg={local.agent.color(local.agent.current()?.name ?? "")}>
                              [{workingFooterFrames[0]}]
                            </text>
                          }
                        >
                          <spinner
                            frames={workingFooterFrames}
                            interval={60}
                            color={local.agent.color(local.agent.current()?.name ?? "")}
                          />
                        </Show>
                        <text fg={theme.textMuted}>·</text>
                        {renderFooterStatus(props.footerStatus) ?? <text fg={theme.text}>Working</text>}
                        <text fg={theme.textMuted}>·</text>
                        <text fg={store.interrupt > 0 ? theme.primary : theme.text}>esc</text>
                        <text fg={store.interrupt > 0 ? theme.primary : theme.textMuted}>
                          {store.interrupt > 0 ? "again to interrupt" : "interrupt"}
                        </text>
                      </box>
                    </Show>
                    {(() => {
                      const retry = createMemo(() => {
                        const s = status()
                        if (s.type !== "retry") return
                        return s
                      })
                      const message = createMemo(() => {
                        const r = retry()
                        if (!r) return
                        if (r.message.includes("exceeded your current quota") && r.message.includes("gemini"))
                          return "gemini is way too hot right now"
                        if (r.message.length > 80) return r.message.slice(0, 80) + "..."
                        return r.message
                      })
                      const isTruncated = createMemo(() => {
                        const r = retry()
                        if (!r) return false
                        return r.message.length > 120
                      })
                      const [seconds, setSeconds] = createSignal(0)
                      onMount(() => {
                        const timer = setInterval(() => {
                          const next = retry()?.next
                          if (next) setSeconds(Math.round((next - Date.now()) / 1000))
                        }, 1000)

                        onCleanup(() => {
                          clearInterval(timer)
                        })
                      })
                      const handleMessageClick = () => {
                        const r = retry()
                        if (!r) return
                        if (isTruncated()) {
                          void DialogAlert.show(dialog, "Retry Error", r.message)
                        }
                      }

                      const retryText = () => {
                        const r = retry()
                        if (!r) return ""
                        const baseMessage = message()
                        const truncatedHint = isTruncated() ? " (click to expand)" : ""
                        const duration = formatDuration(seconds())
                        const retryInfo = ` [retrying ${duration ? `in ${duration} ` : ""}attempt #${r.attempt}]`
                        return baseMessage + truncatedHint + retryInfo
                      }

                      return (
                        <Show when={retry()}>
                          <box onMouseUp={handleMessageClick}>
                            <text fg={theme.error}>{retryText()}</text>
                          </box>
                        </Show>
                      )
                    })()}
                  </box>
                </box>
              </box>
            </Show>
            <Show when={status().type !== "retry"}>
              <box gap={2} flexDirection="row">
                <Show when={local.agent.current()}>
                  {(agent) => (
                    <box flexDirection="row" gap={1}>
                      <text fg={fadeColor(highlight(), agentMetaAlpha())}>
                        {store.mode === "shell" ? "Shell" : Locale.titlecase(agent().name)}
                      </text>
                      <Show when={store.mode === "normal"}>
                        <box flexDirection="row" gap={1}>
                          <text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>·</text>
                          <text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>{currentProviderLabel()}</text>
                          <text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>·</text>
                          <text flexShrink={0} fg={fadeColor(theme.textMuted, modelMetaAlpha())}>
                            {local.model.parsed().model}
                          </text>
                          <Show when={showVariant()}>
                            <text fg={fadeColor(theme.textMuted, variantMetaAlpha())}>·</text>
                            <text>
                              <span style={{ fg: fadeColor(theme.textMuted, variantMetaAlpha()) }}>
                                {currentVariantLabel()}
                              </span>
                            </text>
                          </Show>
                        </box>
                      </Show>
                      <Show when={hasFooterContentAfterModelMeta()}>
                        <text fg={fadeColor(theme.textMuted, variantMetaAlpha())}>·</text>
                      </Show>
                    </box>
                  )}
                </Show>
                <Show when={editorFileLabelDisplay()}>
                  {(file) => (
                    <text
                      fg={theme.secondary}
                      onMouseOver={() => setEditorContextHover(true)}
                      onMouseOut={() => setEditorContextHover(false)}
                      onMouseUp={dismissEditorContext}
                    >
                      {editorContextHover() ? `x ${file()}` : file()}
                    </text>
                  )}
                </Show>
                <Switch>
                  <Match when={store.mode === "normal"}>
                    <Switch>
                      <Match when={usage()}>
                        {(item) => (
                          <text fg={theme.textMuted} wrapMode="none">
                            {item()}
                          </text>
                        )}
                      </Match>
                    </Switch>
                    <text fg={theme.textMuted} wrapMode="none" flexGrow={1}>
                      {directory()}
                    </text>
                  </Match>
                  <Match when={store.mode === "shell"}>
                    <text fg={theme.text}>
                      esc <span style={{ fg: theme.textMuted }}>exit shell mode</span>
                    </text>
                  </Match>
                </Switch>
                <Show when={hasRightContent()}>
                  <box flexDirection="row" gap={1} alignItems="center">
                    {props.right}
                  </box>
                </Show>
              </box>
            </Show>
          </box>
        </Show>
      </box>
    </>
  )
}
