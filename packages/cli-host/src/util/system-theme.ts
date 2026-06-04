import { existsSync } from "fs"
import { createInterface } from "node:readline"
import { Process } from "./process"
import { which } from "./which"

export type ThemeMode = "dark" | "light"
export type ThemeScheme = ThemeMode | "system"

export interface SystemThemeObserver {
  available: boolean
  current(): ThemeMode | undefined
  observe(onChange: (mode: ThemeMode) => void): (() => void) | undefined
}

interface ThemeReader {
  read: () => Promise<ThemeMode | undefined>
  observe?: (onChange: () => void) => (() => void) | undefined
}

interface CreateObserverOptions {
  pollMs?: number
  reader?: ThemeReader
}

const DEFAULT_POLL_MS = 2_000

export async function createSystemThemeObserver(options: CreateObserverOptions = {}): Promise<SystemThemeObserver> {
  const reader = options.reader ?? getThemeReader(process.platform)
  if (!reader) return unavailableSystemThemeObserver()

  const initial = await reader.read().catch(() => undefined)
  if (!initial) return unavailableSystemThemeObserver()

  let current = initial

  return {
    available: true,
    current() {
      return current
    },
    observe(onChange) {
      let active = true
      let pending = false
      const tick = () => {
        if (pending) return
        pending = true
        void reader
          .read()
          .then((next) => {
            if (!active || !next || next === current) return
            current = next
            onChange(next)
          })
          .catch(() => undefined)
          .finally(() => {
            pending = false
          })
      }
      const pollMs = options.pollMs ?? defaultPollMs(process.platform, reader)
      const timer = pollMs === undefined ? undefined : setInterval(tick, pollMs)
      const stopReader = reader.observe?.(tick)

      return () => {
        active = false
        if (timer) clearInterval(timer)
        stopReader?.()
      }
    },
  }
}

export function resolveThemeMode(input: {
  scheme?: ThemeScheme
  system?: ThemeMode
  renderer?: ThemeMode
  fallback: ThemeMode
}) {
  if (input.scheme === "dark" || input.scheme === "light") return input.scheme
  return input.system ?? input.renderer ?? input.fallback
}

function unavailableSystemThemeObserver(): SystemThemeObserver {
  return {
    available: false,
    current() {
      return undefined
    },
    observe() {
      return undefined
    },
  }
}

function getThemeReader(platform: NodeJS.Platform): ThemeReader | undefined {
  if (platform === "darwin") {
    return {
      read: readMacOSThemeMode,
      observe: observeMacOSThemeMode,
    }
  }
  if (platform === "win32") return { read: readWindowsThemeMode }
  if (platform === "linux") return getLinuxThemeReader()
  return
}

function getLinuxThemeReader(): ThemeReader | undefined {
  if (!which("gsettings")) return
  return { read: readLinuxThemeMode }
}

async function readMacOSThemeMode(): Promise<ThemeMode> {
  const result = await Process.text(["defaults", "read", "-g", "AppleInterfaceStyle"], { nothrow: true })
  return result.code === 0 && result.text.trim().toLowerCase() === "dark" ? "dark" : "light"
}

function observeMacOSThemeMode(onChange: () => void) {
  if (!existsSync("/usr/bin/osascript")) return
  const proc = Process.spawn(["/usr/bin/osascript", "-l", "JavaScript", "-e", macOSThemeObserverScript()], {
    stdout: "pipe",
    stderr: "ignore",
  })
  if (!proc.stdout) return

  const lines = createInterface({ input: proc.stdout })
  lines.on("line", (line) => {
    if (line === "theme-changed") onChange()
  })

  return () => {
    lines.close()
    proc.kill()
  }
}

function defaultPollMs(platform: NodeJS.Platform, reader: ThemeReader) {
  if (platform === "darwin" && reader.observe) return
  return DEFAULT_POLL_MS
}

function macOSThemeObserverScript() {
  return [
    "ObjC.import('Foundation')",
    "const center = $.NSDistributedNotificationCenter.defaultCenter",
    "const stdout = $.NSFileHandle.fileHandleWithStandardOutput",
    "const payload = $('theme-changed\\n').dataUsingEncoding($.NSUTF8StringEncoding)",
    "const observer = center.addObserverForNameObjectQueueUsingBlock($('AppleInterfaceThemeChangedNotification'), undefined, $.NSOperationQueue.mainQueue, ObjC.block('void, id', function() { stdout.writeData(payload) }))",
    "$.NSRunLoop.currentRunLoop.run()",
    "center.removeObserver(observer)",
  ].join(";")
}

async function readWindowsThemeMode(): Promise<ThemeMode | undefined> {
  const result = await Process.text(
    [
      "reg",
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
      "/v",
      "AppsUseLightTheme",
    ],
    { nothrow: true },
  )
  if (result.code !== 0) return
  if (/AppsUseLightTheme\s+REG_DWORD\s+0x0\b/i.test(result.text)) return "dark"
  if (/AppsUseLightTheme\s+REG_DWORD\s+0x1\b/i.test(result.text)) return "light"
  return
}

async function readLinuxThemeMode(): Promise<ThemeMode | undefined> {
  const colorScheme = await Process.text(["gsettings", "get", "org.gnome.desktop.interface", "color-scheme"], {
    nothrow: true,
  })
  if (colorScheme.code === 0) {
    const value = colorScheme.text.trim().toLowerCase()
    if (value.includes("prefer-dark")) return "dark"
    if (value.includes("prefer-light") || value.includes("default")) return "light"
  }

  const gtkTheme = await Process.text(["gsettings", "get", "org.gnome.desktop.interface", "gtk-theme"], {
    nothrow: true,
  })
  if (gtkTheme.code !== 0) return

  // GNOME only exposes theme preference consistently through gsettings; use the explicit theme name as a fallback.
  return gtkTheme.text.trim().toLowerCase().includes("dark") ? "dark" : "light"
}
