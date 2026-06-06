import { describe, expect, test } from "bun:test"
import { desktopAvailabilityMessage, detectHostDesktopAvailability } from "@/computer-use/desktop-availability"

describe("computer-use desktop availability", () => {
  test("detects unsupported and non-interactive environments", () => {
    expect(detectHostDesktopAvailability({ platform: "freebsd", env: {}, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "platformUnsupported",
    })
    const unavailable = detectHostDesktopAvailability({ platform: "darwin", env: { CI: "true", TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })
    expect(unavailable).toMatchObject({ available: false, reason: "desktopSessionUnavailable" })
    if (!unavailable.available) expect(desktopAvailabilityMessage(unavailable)).toContain("desktopSessionUnavailable")
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { CI: "1", TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { SSH_CONNECTION: "host", TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { SSH_CLIENT: "host", TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { SSH_TTY: "tty", TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { WSL_DISTRO_NAME: "Ubuntu", DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { WSL_INTEROP: "interop", DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { CODESPACES: "TRUE", DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { REMOTE_CONTAINERS: "true", DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { DEVCONTAINER: "1", DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
  })

  test("detects local desktop sessions", () => {
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { __CF_USER_TEXT_ENCODING: "0x1" }, stdinIsTTY: true })).toEqual({
      available: true,
      reason: "desktop_session_available",
    })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { XPC_SERVICE_NAME: "0" }, stdinIsTTY: true })).toMatchObject({ available: true })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: true })).toMatchObject({ available: true })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { DISPLAY: ":0" }, stdinIsTTY: true })).toMatchObject({ available: true })
    expect(detectHostDesktopAvailability({ platform: "linux", nativePlatforms: ["darwin", "linux"], env: { WAYLAND_DISPLAY: "wayland-0" }, stdinIsTTY: true })).toMatchObject({ available: true })
    expect(detectHostDesktopAvailability({ platform: "win32", nativePlatforms: ["win32"], env: { SESSIONNAME: "Console" }, stdinIsTTY: true })).toMatchObject({ available: true })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: { TERM_PROGRAM: "Apple_Terminal" }, stdinIsTTY: false })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
    expect(detectHostDesktopAvailability({ platform: "darwin", env: {}, stdinIsTTY: true })).toMatchObject({
      available: false,
      reason: "desktopSessionUnavailable",
    })
  })
})
