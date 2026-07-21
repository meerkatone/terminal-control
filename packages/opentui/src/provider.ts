import { createConnection } from "node:net"

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

  let buffer = ""
  let protocolReady = false
  let readySettled = false
  let resolveReady!: (value: boolean) => void
  const ready = new Promise<boolean>((resolve) => {
    resolveReady = resolve
  })
  const settleReady = (value: boolean) => {
    if (readySettled) return
    readySettled = true
    resolveReady(value)
  }
  const socket = createConnection(socketPath)
  socket.setEncoding("utf8")
  const handshakeTimer = setTimeout(() => fail(new Error("Terminal Control semantic handshake timed out")), 5_000)
  handshakeTimer.unref()

  socket.once("connect", () =>
    send({
      type: "hello",
      protocolVersion: 1,
      application: options.application,
      capabilities: ["semantic.snapshot"],
    }),
  )
  socket.on("data", (chunk) => {
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
  socket.once("error", fail)
  socket.once("close", () => {
    clearTimeout(handshakeTimer)
    settleReady(false)
  })

  function receive(message: unknown) {
    if (!isRecord(message)) throw new Error("Terminal Control sent an invalid semantic message")
    if (message.type === "ready" && message.protocolVersion === 1 && !protocolReady) {
      protocolReady = true
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
        sendError(
          id,
          isRecord(error) && typeof error.code === "string" ? error.code : "SNAPSHOT_FAILED",
          error instanceof Error ? error.message : String(error),
        ),
      )
  }

  function sendError(id: number, code: string, message: string) {
    send({ type: "error", id, error: { code, message } })
  }

  function send(message: unknown) {
    if (!socket.destroyed) socket.write(`${JSON.stringify(message)}\n`)
  }

  function fail(error: unknown) {
    clearTimeout(handshakeTimer)
    settleReady(false)
    options.onError?.(error)
    socket.destroy()
  }

  return {
    enabled: true,
    ready,
    close() {
      clearTimeout(handshakeTimer)
      settleReady(false)
      socket.destroy()
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
