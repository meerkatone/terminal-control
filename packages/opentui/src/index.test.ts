import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { BoxRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { elements, provideTerminalControl, semanticSnapshot } from "./index"

test("discovers the same live interactable elements used by semantic snapshots", async () => {
  const setup = await createTestRenderer({ width: 20, height: 5 })
  const button = new BoxRenderable(setup.renderer, {
    id: "submit",
    width: 10,
    height: 3,
    onMouseDown: () => {},
  })
  setup.renderer.root.add(button)
  await setup.renderOnce()

  expect(elements(setup.renderer)).toEqual([
    {
      id: "submit",
      num: button.num,
      x: 0,
      y: 0,
      width: 10,
      height: 3,
      focusable: false,
      focused: false,
      clickable: true,
      editor: false,
    },
  ])
  expect(semanticSnapshot(setup.renderer)).toEqual({
    format: "termctrl-semantic-snapshot-v1",
    nodes: [
      {
        id: "submit",
        role: "button",
        label: "submit",
        element: button.num,
        focused: false,
        disabled: false,
      },
    ],
  })
  setup.renderer.destroy()
})

test("provides semantic snapshots over the discovered Terminal Control socket", async () => {
  const setup = await createTestRenderer({ width: 20, height: 5 })
  setup.renderer.root.add(
    new BoxRenderable(setup.renderer, {
      id: "submit",
      width: 10,
      height: 3,
      onMouseDown: () => {},
    }),
  )
  await setup.renderOnce()
  const directory = await mkdtemp(join(tmpdir(), "termctrl-opentui-"))
  const socketPath = join(directory, "semantic.sock")
  let resolveResult!: (value: unknown) => void
  const result = new Promise((resolve) => {
    resolveResult = resolve
  })
  const server = createServer((socket) => {
    socket.setEncoding("utf8")
    let buffer = ""
    socket.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const message = JSON.parse(line)
        if (message.type === "hello") {
          expect(message.capabilities).toEqual(["semantic.snapshot"])
          socket.write(`${JSON.stringify({ type: "ready", protocolVersion: 1 })}\n`)
          socket.write(`${JSON.stringify({ type: "semantic.snapshot", id: 1 })}\n`)
        }
        if (message.type === "result") resolveResult(message.value)
      }
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(socketPath, resolve)
  })
  const provider = provideTerminalControl(setup.renderer, {
    application: { name: "fixture", version: "1.0.0" },
    socketPath,
  })

  try {
    expect(await provider.ready).toBe(true)
    expect(await result).toEqual(semanticSnapshot(setup.renderer))
  } finally {
    provider.close()
    setup.renderer.destroy()
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await rm(directory, { recursive: true, force: true })
  }
})
