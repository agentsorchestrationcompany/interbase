import { createStore, produce } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { batch, createEffect, createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { uniqueBy } from "remeda"
import path from "path"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { iife } from "@/util/iife"
import { useToast } from "../ui/toast"
import { useArgs } from "./args"
import { useSDK } from "./sdk"
import { RGBA } from "@opentui/core"
import { Filesystem } from "@/util/filesystem"
import { useRoute } from "./route"
import {
  persistedSessionModelSelection,
  resolveCurrentModel,
  resolveSessionScopedModel,
  sameSessionModel,
  selectedModelVariant,
  toRecentModelSelection,
  toSessionModelSelection,
  type TuiModelSelection,
  type TuiSessionModelSelection,
} from "./local-model"

export function parseModel(model: string) {
  const [providerID, ...rest] = model.split("/")
  return {
    providerID: providerID,
    modelID: rest.join("/"),
  }
}

export const { use: useLocal, provider: LocalProvider } = createSimpleContext({
  name: "Local",
  init: () => {
    const sync = useSync()
    const sdk = useSDK()
    const toast = useToast()
    const route = useRoute()

    function isModelValid(model: TuiModelSelection) {
      const provider = sync.data.provider.find((x) => x.id === model.providerID)
      return !!provider?.models[model.modelID]
    }

    function activeSessionID() {
      const current = route.data
      if (current.type !== "session") return undefined
      return current.sessionID
    }

    const agent = iife(() => {
      const agents = createMemo(() => sync.data.agent.filter((x) => x.mode !== "subagent" && !x.hidden))
      const visibleAgents = createMemo(() => sync.data.agent.filter((x) => !x.hidden))
      const [agentStore, setAgentStore] = createStore({
        current: undefined as string | undefined,
      })
      const { theme } = useTheme()
      const colors = createMemo(() => [
        theme.secondary,
        theme.accent,
        theme.success,
        theme.warning,
        theme.primary,
        theme.error,
        theme.info,
      ])
      return {
        list() {
          return agents()
        },
        current() {
          return agents().find((x) => x.name === agentStore.current) ?? agents().at(0)
        },
        set(name: string) {
          if (!agents().some((x) => x.name === name))
            return toast.show({
              variant: "warning",
              message: `Agent not found: ${name}`,
              duration: 3000,
            })
          setAgentStore("current", name)
        },
        move(direction: 1 | -1) {
          batch(() => {
            const current = this.current()
            if (!current) return
            let next = agents().findIndex((x) => x.name === current.name) + direction
            if (next < 0) next = agents().length - 1
            if (next >= agents().length) next = 0
            const value = agents()[next]
            setAgentStore("current", value.name)
          })
        },
        color(name: string) {
          const index = visibleAgents().findIndex((x) => x.name === name)
          if (index === -1) return colors()[0]
          const agent = visibleAgents()[index]

          if (agent?.color) {
            const color = agent.color
            if (color.startsWith("#")) return RGBA.fromHex(color)
            // already validated by config, just satisfying TS here
            return theme[color as keyof typeof theme] as RGBA
          }
          return colors()[index % colors().length]
        },
      }
    })

    const model = iife(() => {
      type ModelStateFile = {
        recent?: TuiModelSelection[]
        favorite?: TuiModelSelection[]
        variant?: Record<string, string | undefined>
      }

      const [modelStore, setModelStore] = createStore<{
        ready: boolean
        model: Record<string, TuiModelSelection>
        session: Record<string, TuiSessionModelSelection>
        recent: TuiModelSelection[]
        favorite: TuiModelSelection[]
        variant: Record<string, string | undefined>
      }>({
        ready: false,
        model: {},
        session: {},
        recent: [],
        favorite: [],
        variant: {},
      })

      const filePath = path.join(interbaseRuntimeContext.paths.state, "model.json")
      const state = {
        pending: false,
      }

      function save() {
        if (!modelStore.ready) {
          state.pending = true
          return
        }
        state.pending = false
        void Filesystem.writeJson(filePath, {
          recent: modelStore.recent,
          favorite: modelStore.favorite,
          variant: modelStore.variant,
        })
      }

      Filesystem.readJson<ModelStateFile>(filePath)
        .then((x) => {
          if (Array.isArray(x.recent)) setModelStore("recent", x.recent)
          if (Array.isArray(x.favorite)) setModelStore("favorite", x.favorite)
          if (typeof x.variant === "object" && x.variant !== null) setModelStore("variant", x.variant)
        })
        .catch(() => {})
        .finally(() => {
          setModelStore("ready", true)
          if (state.pending) save()
        })

      const args = useArgs()
      const fallbackModel = createMemo(() => {
        if (args.model) {
          const { providerID, modelID } = parseModel(args.model)
          if (isModelValid({ providerID, modelID })) {
            return {
              providerID,
              modelID,
            }
          }
        }

        if (sync.data.config.model) {
          const { providerID, modelID } = parseModel(sync.data.config.model)
          if (isModelValid({ providerID, modelID })) {
            return {
              providerID,
              modelID,
            }
          }
        }

        for (const item of modelStore.recent) {
          if (isModelValid(item)) {
            return item
          }
        }

        const provider = sync.data.provider[0]
        if (!provider) return undefined
        const defaultModel = sync.data.provider_default[provider.id]
        const firstModel = Object.values(provider.models)[0]
        const model = defaultModel ?? firstModel?.id
        if (!model) return undefined
        return {
          providerID: provider.id,
          modelID: model,
        }
      })

      function persistedSessionModel(sessionID: string | undefined) {
        if (!sessionID) return undefined
        return persistedSessionModelSelection(sync.session.get(sessionID)?.model)
      }

      function lastUserModel(sessionID: string | undefined) {
        if (!sessionID) return undefined
        const messages = sync.data.message[sessionID]
        return messages?.findLast((m) => m.role === "user")?.model
      }

      function sessionScopedModel(sessionID = activeSessionID()) {
        return resolveSessionScopedModel(
          {
            sessionOverride: sessionID ? modelStore.session[sessionID] : undefined,
            persistedSessionModel: persistedSessionModel(sessionID),
            lastUserModel: lastUserModel(sessionID),
          },
          isModelValid,
        )
      }

      const currentModel = createMemo(() => {
        const a = agent.current()
        return resolveCurrentModel(
          {
            sessionScopedModel: sessionScopedModel(),
            agentSelectedModel: a ? modelStore.model[a.name] : undefined,
            agentConfiguredModel: a?.model,
            fallbackModel: fallbackModel(),
          },
          isModelValid,
        )
      })

      createEffect(() => {
        for (const item of sync.data.session) {
          const override = modelStore.session[item.id]
          const persisted = persistedSessionModelSelection(item.model)
          if (!sameSessionModel(override, persisted)) continue
          setModelStore(
            "session",
            produce((draft) => {
              delete draft[item.id]
            }),
          )
        }
      })

      return {
        current: currentModel,
        get ready() {
          return modelStore.ready
        },
        recent() {
          return modelStore.recent
        },
        favorite() {
          return modelStore.favorite
        },
        parsed: createMemo(() => {
          const value = currentModel()
          if (!value) {
            return {
              provider: "Connect a provider",
              model: "No provider selected",
              reasoning: false,
            }
          }
          const provider = sync.data.provider.find((x) => x.id === value.providerID)
          const info = provider?.models[value.modelID]
          return {
            provider: provider?.name ?? value.providerID,
            model: info?.name ?? value.modelID,
            reasoning: info?.capabilities?.reasoning ?? false,
          }
        }),
        cycle(direction: 1 | -1) {
          const current = currentModel()
          if (!current) return
          const recent = modelStore.recent
          const index = recent.findIndex((x) => x.providerID === current.providerID && x.modelID === current.modelID)
          if (index === -1) return
          let next = index + direction
          if (next < 0) next = recent.length - 1
          if (next >= recent.length) next = 0
          const val = recent[next]
          if (!val) return
          this.set(val)
        },
        cycleFavorite(direction: 1 | -1) {
          const favorites = modelStore.favorite.filter((item) => isModelValid(item))
          if (!favorites.length) {
            toast.show({
              variant: "info",
              message: "Add a favorite model to use this shortcut",
              duration: 3000,
            })
            return
          }
          const current = currentModel()
          let index = -1
          if (current) {
            index = favorites.findIndex((x) => x.providerID === current.providerID && x.modelID === current.modelID)
          }
          if (index === -1) {
            index = direction === 1 ? 0 : favorites.length - 1
          } else {
            index += direction
            if (index < 0) index = favorites.length - 1
            if (index >= favorites.length) index = 0
          }
          const next = favorites[index]
          if (!next) return
          this.set(next)
          const uniq = uniqueBy([next, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
          if (uniq.length > 10) uniq.pop()
          setModelStore(
            "recent",
            uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
          )
          save()
        },
        set(model: TuiSessionModelSelection, options?: { persist?: boolean; recent?: boolean; sessionID?: string }) {
          batch(() => {
            if (!isModelValid(model)) {
              toast.show({
                message: `Model ${model.providerID}/${model.modelID} is not valid`,
                variant: "warning",
                duration: 3000,
              })
              return
            }
            const sessionID = options?.sessionID ?? activeSessionID()
            if (sessionID) {
              setModelStore("session", sessionID, toSessionModelSelection(model))
              if (options?.persist !== false) {
                void sdk.client.session
                  .update({
                    sessionID,
                    model: {
                      providerID: model.providerID,
                      id: model.modelID,
                      variant: model.variant,
                    },
                  })
                  .then((response) => {
                    if (response.error) {
                      toast.show({
                        message: "Switching model failed.",
                        variant: "error",
                        duration: 3000,
                      })
                    }
                  })
                  .catch((error: Error) => {
                    toast.show({
                      message: `Switching model failed: ${error.message}`,
                      variant: "error",
                      duration: 3000,
                    })
                  })
              }
            } else {
              const a = agent.current()
              if (!a) return
              setModelStore("model", a.name, toRecentModelSelection(model))
            }
            if (options?.recent) {
              const recent = toRecentModelSelection(model)
              const uniq = uniqueBy([recent, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
              if (uniq.length > 10) uniq.pop()
              setModelStore(
                "recent",
                uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
              )
              save()
            }
          })
        },
        toggleFavorite(model: TuiModelSelection) {
          batch(() => {
            if (!isModelValid(model)) {
              toast.show({
                message: `Model ${model.providerID}/${model.modelID} is not valid`,
                variant: "warning",
                duration: 3000,
              })
              return
            }
            const exists = modelStore.favorite.some(
              (x) => x.providerID === model.providerID && x.modelID === model.modelID,
            )
            const next = exists
              ? modelStore.favorite.filter((x) => x.providerID !== model.providerID || x.modelID !== model.modelID)
              : [model, ...modelStore.favorite]
            setModelStore(
              "favorite",
              next.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
            )
            save()
          })
        },
        variant: {
          selected() {
            const m = currentModel()
            if (!m) return undefined
            const key = `${m.providerID}/${m.modelID}`
            return selectedModelVariant({
              currentModel: m,
              sessionScopedModel: sessionScopedModel(),
              storedVariant: modelStore.variant[key],
            })
          },
          current() {
            const v = this.selected()
            if (!v) return undefined
            if (!this.list().includes(v)) return undefined
            return v
          },
          list() {
            const m = currentModel()
            if (!m) return []
            const provider = sync.data.provider.find((x) => x.id === m.providerID)
            const info = provider?.models[m.modelID]
            if (!info?.variants) return []
            return Object.keys(info.variants)
          },
          set(value: string | undefined) {
            const m = currentModel()
            if (!m) return
            const sessionID = activeSessionID()
            if (sessionID) {
              const next = toSessionModelSelection({
                providerID: m.providerID,
                modelID: m.modelID,
                variant: value,
              })
              setModelStore("session", sessionID, next)
              model.set(next, { sessionID })
              return
            }
            const key = `${m.providerID}/${m.modelID}`
            setModelStore("variant", key, value ?? "default")
            save()
          },
          cycle() {
            const variants = this.list()
            if (variants.length === 0) return
            const current = this.current()
            if (!current) {
              this.set(variants[0])
              return
            }
            const index = variants.indexOf(current)
            if (index === -1 || index === variants.length - 1) {
              this.set(undefined)
              return
            }
            this.set(variants[index + 1])
          },
        },
      }
    })

    const mcp = {
      isEnabled(name: string) {
        const status = sync.data.mcp[name]
        return status?.status === "connected"
      },
      async toggle(name: string) {
        const status = sync.data.mcp[name]
        if (status?.status === "connected") {
          // Disable: disconnect the MCP
          await sdk.client.mcp.disconnect({ name })
        } else {
          // Enable/Retry: connect the MCP (handles disabled, failed, and other states)
          await sdk.client.mcp.connect({ name })
        }
      },
    }

    // Automatically update model when agent changes
    createEffect(() => {
      const value = agent.current()
      if (!value) return
      if (activeSessionID()) return
      if (value.model) {
        if (isModelValid(value.model))
          model.set({
            providerID: value.model.providerID,
            modelID: value.model.modelID,
          })
        else
          toast.show({
            variant: "warning",
            message: `Agent ${value.name}'s configured model ${value.model.providerID}/${value.model.modelID} is not valid`,
            duration: 3000,
          })
      }
    })

    const result = {
      model,
      agent,
      mcp,
    }
    return result
  },
})
