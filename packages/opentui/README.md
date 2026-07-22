# @kitlangton/terminal-control-opentui

Expose a consistent semantic snapshot from any OpenTUI application controlled by Terminal Control.

```bash
bun add @kitlangton/terminal-control-opentui @opentui/core
```

Pass the application's live `CliRenderer` during startup:

```ts
import { provideTerminalControl } from "@kitlangton/terminal-control-opentui"

const terminalControl = provideTerminalControl(renderer, {
  application: { name: "my-tui", version: "1.0.0" },
})

renderer.once("destroy", () => terminalControl.close())
```

Outside Terminal Control the integration is a no-op. Launch the application with Terminal Control's
OpenTUI host profile, then inspect the semantic tree:

```bash
termctrl start app --host opentui -- my-tui
termctrl show app --format semantic
```

The package walks the live OpenTUI render tree and consistently discovers visible focused editors,
focusable controls, and reachable mouse targets. It derives roles, labels, focus state, and live
numeric element handles without requiring every application to maintain its own walker.

`elements(renderer)` and `semanticSnapshot(renderer)` are also exported for tests and custom
integrations.

Publish the package directly from this directory:

```bash
npm publish --access public
```

The repository-level `npm run release-packages` command calls this package's retry-safe `release`
script after publishing the native Terminal Control package set.
