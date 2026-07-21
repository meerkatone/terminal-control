import type { CliRenderer, Renderable } from "@opentui/core"
import { provideSemanticSnapshot, type Provider } from "./provider.js"

export type InteractableElement = {
  readonly id: string
  readonly num: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly focusable: boolean
  readonly focused: boolean
  readonly clickable: boolean
  readonly editor: boolean
}

export type SemanticNode = {
  readonly id: string
  readonly role: string
  readonly label?: string
  readonly element: number
  readonly focused: boolean
  readonly disabled: boolean
}

export type SemanticSnapshot = {
  readonly format: "termctrl-semantic-snapshot-v1"
  readonly nodes: ReadonlyArray<SemanticNode>
}

function children(renderable: Renderable) {
  return renderable.getChildren().filter((child): child is Renderable => "num" in child)
}

function all(renderable: Renderable): Renderable[] {
  return [renderable, ...children(renderable).flatMap(all)]
}

function hasMouseListeners(renderable: Renderable) {
  const listener = Reflect.get(renderable, "_mouseListener")
  const listeners = Reflect.get(renderable, "_mouseListeners")
  return Boolean(listener) || (isRecord(listeners) && Object.keys(listeners).length > 0)
}

function receivesClick(renderer: CliRenderer, renderable: Renderable) {
  if (renderable.width <= 0 || renderable.height <= 0) return false
  const x = Math.floor(renderable.screenX + renderable.width / 2)
  const y = Math.floor(renderable.screenY + renderable.height / 2)
  const target = renderer.hitTest(x, y)
  return all(renderable).some((item) => item.num === target)
}

export function elements(renderer: CliRenderer): InteractableElement[] {
  return all(renderer.root)
    .filter((renderable) => renderable.visible && !renderable.isDestroyed)
    .map((renderable) => ({
      id: renderable.id,
      num: renderable.num,
      x: renderable.screenX,
      y: renderable.screenY,
      width: renderable.width,
      height: renderable.height,
      focusable: renderable.focusable,
      focused: renderable.focused,
      clickable: hasMouseListeners(renderable) && receivesClick(renderer, renderable),
      editor: renderer.currentFocusedEditor === renderable,
    }))
    .filter((element) => element.focusable || element.clickable || element.editor)
}

export function semanticSnapshot(renderer: CliRenderer): SemanticSnapshot {
  const renderables = new Map(all(renderer.root).map((renderable) => [renderable.num, renderable]))
  const ids = new Set<string>()
  return {
    format: "termctrl-semantic-snapshot-v1",
    nodes: elements(renderer).map((element) => {
      const preferred = element.id || `renderable-${element.num}`
      const id = ids.has(preferred) ? `${preferred}-${element.num}` : preferred
      ids.add(id)
      return {
        id,
        role: element.editor ? "textbox" : element.clickable ? "button" : "control",
        label: label(renderables.get(element.num), element),
        element: element.num,
        focused: element.focused || element.editor,
        disabled: false,
      }
    }),
  }
}

export function provideTerminalControl(
  renderer: CliRenderer,
  options: {
    readonly application: { readonly name: string; readonly version?: string }
    readonly socketPath?: string
    readonly onError?: (error: unknown) => void
  },
): Provider {
  return provideSemanticSnapshot({
    ...options,
    snapshot: async () => {
      renderer.requestRender()
      await renderer.idle()
      return semanticSnapshot(renderer)
    },
  })
}

function label(renderable: Renderable | undefined, element: InteractableElement) {
  if (!renderable || element.editor) return element.id || undefined
  const text = all(renderable)
    .map((item) => Reflect.get(item, "plainText"))
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
  return text?.replaceAll(/\s+/g, " ").trim() || element.id || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
