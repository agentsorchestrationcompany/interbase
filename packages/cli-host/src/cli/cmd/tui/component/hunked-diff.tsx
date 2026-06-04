import { createMemo, createSignal, For, Show } from "solid-js"
import type { RGBA, SyntaxStyle } from "@opentui/core"
import { AsciiBorder } from "./border"
import { isCreatedDiffHunk, splitDiffHunks } from "./hunked-diff-util"
import { useTheme } from "../context/theme"
import { useRenderer, type JSX } from "@opentui/solid"

export function HunkedDiff(props: {
  diff: string
  view: "unified" | "split"
  filetype?: string
  syntaxStyle?: SyntaxStyle
  showLineNumbers?: boolean
  width?: number | "auto" | `${number}%`
  wrapMode?: "word" | "char" | "none"
  fg?: string | RGBA
  addedBg?: string | RGBA
  removedBg?: string | RGBA
  contextBg?: string | RGBA
  addedSignColor?: string | RGBA
  removedSignColor?: string | RGBA
  lineNumberFg?: string | RGBA
  lineNumberBg?: string | RGBA
  addedLineNumberBg?: string | RGBA
  removedLineNumberBg?: string | RGBA
}) {
  const hunks = createMemo(() => splitDiffHunks(props.diff))

  return (
    <box flexDirection="column" width={props.width ?? "100%"}>
      <For each={hunks()}>
        {(hunk, index) => (
          <>
            <diff
              diff={hunk}
              view={isCreatedDiffHunk(hunk) ? "unified" : props.view}
              filetype={props.filetype}
              syntaxStyle={props.syntaxStyle}
              showLineNumbers={props.showLineNumbers}
              width="100%"
              wrapMode={props.wrapMode}
              fg={props.fg}
              addedBg={props.addedBg}
              removedBg={props.removedBg}
              contextBg={props.contextBg}
              addedSignColor={props.addedSignColor}
              removedSignColor={props.removedSignColor}
              lineNumberFg={props.lineNumberFg}
              lineNumberBg={props.lineNumberBg}
              addedLineNumberBg={props.addedLineNumberBg}
              removedLineNumberBg={props.removedLineNumberBg}
            />
            <Show when={index() < hunks().length - 1}>
              <box marginBottom={1} />
            </Show>
          </>
        )}
      </For>
    </box>
  )
}

export function HunkedDiffBlock(props: Parameters<typeof HunkedDiff>[0] & {
  title: string
  error?: string
  footer?: JSX.Element
  footerWhen?: boolean
  onClick?: () => void
}) {
  const { theme } = useTheme()
  const renderer = useRenderer()
  const [hover, setHover] = createSignal(false)
  const hunks = createMemo(() => splitDiffHunks(props.diff))
  const hasFooter = createMemo(() => props.footerWhen === true || props.error !== undefined)

  return (
    <box
      flexDirection="column"
      width={props.width ?? "100%"}
      marginTop={1}
      backgroundColor={hover() ? theme.backgroundMenu : theme.backgroundPanel}
      onMouseOver={() => props.onClick && setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={() => {
        if (renderer.getSelection()?.getSelectedText()) return
        props.onClick?.()
      }}
    >
      <box border={["top", "left", "right"]} customBorderChars={AsciiBorder} borderColor={theme.borderSubtle} paddingTop={1} paddingBottom={1} paddingLeft={2}>
        <text paddingLeft={1} fg={theme.textMuted}>{props.title}</text>
      </box>
      <For each={hunks()}>
        {(hunk, index) => (
          <box
            border={["top", "left", "right", ...(index() === hunks().length - 1 && !hasFooter() ? ["bottom" as const] : [])]}
            customBorderChars={AsciiBorder}
            borderColor={theme.borderSubtle}
          >
            <diff
              diff={hunk}
              view={isCreatedDiffHunk(hunk) ? "unified" : props.view}
              filetype={props.filetype}
              syntaxStyle={props.syntaxStyle}
              showLineNumbers={props.showLineNumbers}
              width="100%"
              wrapMode={props.wrapMode}
              fg={props.fg}
              addedBg={props.addedBg}
              removedBg={props.removedBg}
              contextBg={props.contextBg}
              addedSignColor={props.addedSignColor}
              removedSignColor={props.removedSignColor}
              lineNumberFg={props.lineNumberFg}
              lineNumberBg={props.lineNumberBg}
              addedLineNumberBg={props.addedLineNumberBg}
              removedLineNumberBg={props.removedLineNumberBg}
            />
          </box>
        )}
      </For>
      <Show when={hasFooter()}>
        <box border={["top", "left", "right", "bottom"]} customBorderChars={AsciiBorder} borderColor={theme.borderSubtle} paddingTop={1} paddingBottom={1} paddingLeft={2}>
          {props.footer}
          <Show when={props.error}>
            {(error) => <text fg={theme.error}>{error()}</text>}
          </Show>
        </box>
      </Show>
    </box>
  )
}
