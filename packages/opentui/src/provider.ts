import { createConnection, type Socket } from "node:net"

export type Provider = {
  readonly enabled: boolean
  readonly ready: Promise<boolean>
  close(): void
}

export function provideSemanticSnapshot(options: {
  readonly application: { readonly name: string; readonly version?: string }
  readonly snapshot: () => unknown | Promise<unknown>
  readonly socketPath?: string
  readonly onError?: (error: unknown) => void
}): Provider {
  if (!options.application.name) throw new TypeError("application.name is required")
  const socketPath = options.socketPath ?? process.env.TERMCTRL_SEMANTIC_SOCKET
  if (!socketPath) return { enabled: false, ready: Promise.resolve(false), close() {} }
  const semanticSocketPath = socketPath

  let readySettled = false
  let connectedOnce = false
  let closed = false
  let socket: Socket | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectDelay = 25
  let resolveReady!: (value: boolean) => void
  const ready = new Promise<boolean>((resolve) => {
    resolveReady = resolve
  })
  const settleReady = (value: boolean) => {
    if (readySettled) return
    readySettled = true
    resolveReady(value)
  }
  connect()

  function connect() {
    let buffer = ""
    let protocolReady = false
    const connection = createConnection(semanticSocketPath)
    socket = connection
    connection.setEncoding("utf8")
    const handshakeTimer = setTimeout(
      () => fail(new Error("Terminal Control semantic handshake timed out")),
      5_000,
    )
    handshakeTimer.unref()

    connection.once("connect", () =>
      send({
        type: "hello",
        protocolVersion: 1,
        application: options.application,
        capabilities: ["semantic.snapshot"],
      }),
    )
    connection.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line) return fail(new Error("Terminal Control sent an empty semantic message"))
        try {
          receive(JSON.parse(line))
        } catch (error) {
          return fail(error)
        }
      }
    })
    connection.once("error", fail)
    connection.once("close", () => {
      clearTimeout(handshakeTimer)
      if (socket === connection) socket = undefined
      settleReady(false)
      if (!closed && connectedOnce) {
        reconnectTimer = setTimeout(connect, reconnectDelay)
        reconnectTimer.unref()
        reconnectDelay = Math.min(reconnectDelay * 2, 1_000)
      }
    })

    function receive(message: unknown) {
      if (!isRecord(message)) throw new Error("Terminal Control sent an invalid semantic message")
      if (message.type === "ready" && message.protocolVersion === 1 && !protocolReady) {
        protocolReady = true
        connectedOnce = true
        reconnectDelay = 25
        clearTimeout(handshakeTimer)
        settleReady(true)
        return
      }
      if (message.type !== "semantic.snapshot" || !protocolReady || !Number.isSafeInteger(message.id)) {
        throw new Error("Terminal Control sent an invalid semantic snapshot request")
      }
      const id = message.id as number
      Promise.resolve()
        .then(options.snapshot)
        .then((value) => send({ type: "result", id, value }))
        .catch((error) =>
          send({
            type: "error",
            id,
            error: {
              code: isRecord(error) && typeof error.code === "string" ? error.code : "SNAPSHOT_FAILED",
              message: error instanceof Error ? error.message : String(error),
            },
          }),
        )
    }

    function send(message: unknown) {
      if (!connection.destroyed) connection.write(`${JSON.stringify(message)}\n`)
    }

    function fail(error: unknown) {
      clearTimeout(handshakeTimer)
      if (!connectedOnce) settleReady(false)
      options.onError?.(error)
      connection.destroy()
    }
  }

  return {
    enabled: true,
    ready,
    close() {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      settleReady(false)
      socket?.destroy()
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
