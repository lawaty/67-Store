"use client"
/**
 * Debounced player-id verification against the read-only storefront endpoint.
 */
import { useEffect, useState } from "react"

export type PlayerCheckStatus = "idle" | "checking" | "valid" | "invalid" | "unverified"

export type PlayerCheckState = {
  readonly status: PlayerCheckStatus
  readonly name: string | null
}

export function usePlayerCheck(game: string, userId: string, serverId: string): PlayerCheckState {
  const [state, setState] = useState<PlayerCheckState>({ status: "idle", name: null })

  useEffect(() => {
    const id = userId.trim()
    const server = serverId.trim()
    if (id === "" || server === "") {
      setState({ status: "idle", name: null })
      return
    }

    const controller = new AbortController()
    setState({ status: "checking", name: null })

    const timer = setTimeout(() => {
      fetch("/api/players/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, userId: id, serverId: server }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.status === 503) {
            setState({ status: "unverified", name: null })
            return
          }
          if (!response.ok) {
            setState({ status: "invalid", name: null })
            return
          }
          const body = (await response.json()) as { valid?: unknown; name?: unknown }
          setState(
            body.valid === true
              ? { status: "valid", name: typeof body.name === "string" ? body.name : null }
              : { status: "invalid", name: null },
          )
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setState({ status: "unverified", name: null })
        })
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [game, userId, serverId])

  return state
}
