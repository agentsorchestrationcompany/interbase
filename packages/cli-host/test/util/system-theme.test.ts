import { afterEach, expect, mock, test } from "bun:test"

afterEach(() => {
  mock.restore()
})

test("resolveThemeMode prefers explicit scheme then system then renderer then fallback", async () => {
  const { resolveThemeMode } = await import("../../src/util/system-theme")

  expect(resolveThemeMode({ scheme: "light", system: "dark", renderer: "dark", fallback: "dark" })).toBe("light")
  expect(resolveThemeMode({ scheme: "dark", system: "light", renderer: "light", fallback: "light" })).toBe("dark")
  expect(resolveThemeMode({ system: "light", renderer: "dark", fallback: "dark" })).toBe("light")
  expect(resolveThemeMode({ renderer: "light", fallback: "dark" })).toBe("light")
  expect(resolveThemeMode({ fallback: "dark" })).toBe("dark")
})

test("createSystemThemeObserver is unavailable when the initial read fails", async () => {
  const { createSystemThemeObserver } = await import("../../src/util/system-theme")

  const observer = await createSystemThemeObserver({
    reader: {
      read: async () => undefined,
    },
  })

  expect(observer.available).toBe(false)
  expect(observer.current()).toBeUndefined()
  expect(observer.observe(() => undefined)).toBeUndefined()
})

test("createSystemThemeObserver publishes live changes from the reader", async () => {
  const values: Array<"dark" | "light" | undefined> = ["dark", "dark", "light", "light"]
  const { createSystemThemeObserver } = await import("../../src/util/system-theme")
  const observer = await createSystemThemeObserver({
    pollMs: 10,
    reader: {
      read: async () => values.shift(),
    },
  })

  expect(observer.available).toBe(true)
  expect(observer.current()).toBe("dark")

  const seen: string[] = []
  const changed = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("observer did not publish theme change")), 250)
    const stop = observer.observe((mode) => {
      seen.push(mode)
      clearTimeout(timeout)
      stop?.()
      resolve()
    })
  })

  await changed
  expect(seen).toEqual(["light"])
  expect(observer.current()).toBe("light")
})

test("createSystemThemeObserver reacts immediately to reader observe events", async () => {
  const values: Array<"dark" | "light" | undefined> = ["dark", "light"]
  let notify: () => void = () => undefined
  const { createSystemThemeObserver } = await import("../../src/util/system-theme")
  const observer = await createSystemThemeObserver({
    reader: {
      read: async () => values.shift(),
      observe(onChange) {
        notify = onChange
        return () => {
          notify = () => undefined
        }
      },
    },
  })

  const seen: string[] = []
  const changed = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("observer did not publish theme change")), 250)
    const stop = observer.observe((mode) => {
      seen.push(mode)
      clearTimeout(timeout)
      stop?.()
      resolve()
    })
  })

  notify()
  await changed
  expect(seen).toEqual(["light"])
  expect(observer.current()).toBe("light")
})
