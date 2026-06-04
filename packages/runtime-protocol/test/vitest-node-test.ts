import { test as vitestTest } from "vitest"

function wrapContext(context: Record<PropertyKey, unknown>) {
  return new Proxy(context, {
    get(target, prop, receiver) {
      if (prop === "after") {
        const onTestFinished = Reflect.get(target, "onTestFinished", receiver)
        return typeof onTestFinished === "function" ? onTestFinished.bind(target) : undefined
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

function wrapBody(body: unknown) {
  if (typeof body !== "function") {
    return body
  }

  return (context: Record<PropertyKey, unknown>) => body(wrapContext(context))
}

function invoke(base: (...args: unknown[]) => unknown, args: unknown[]) {
  if (typeof args[1] === "function" || args.length < 2) {
    return base(args[0], wrapBody(args[1]))
  }

  if (typeof args[2] === "function" || args.length < 3) {
    return base(args[0], args[1], wrapBody(args[2]))
  }

  return base(...args)
}

function wrapTest(base: (...args: unknown[]) => unknown) {
  const compat = (...args: unknown[]) => invoke(base, args)

  return new Proxy(compat, {
    get(_target, prop, _receiver) {
      const value = (base as Record<PropertyKey, unknown>)[prop]
      return typeof value === "function" ? wrapTest(value as (...args: unknown[]) => unknown) : value
    },
  })
}

export default wrapTest(vitestTest)
