# @cellshot/test

Private experimental TypeScript test client for `cellshot driver`.

Use a locally built binary while this package remains private:

```ts
import { createCellshot } from "@cellshot/test"

await using cellshot = await createCellshot({
  binaryPath: "../../target/release/cellshot",
})
```

The runtime resolves an explicit `binaryPath` first, then `CELLSHOT_BINARY`, then an optional native package for the current platform. The intended publish layout is `@cellshot/test` plus `@cellshot/darwin-arm64`, `@cellshot/darwin-x64`, `@cellshot/linux-arm64-gnu`, and `@cellshot/linux-x64-gnu`, each exposing `bin/cellshot`. Those native packages are intentionally not published or declared as dependencies until clean-consumer package validation is in place.

Visible screen text and frames are stable snapshot surfaces:

```ts
await using session = await cellshot.launch({ command: ["my-tui"] })
await session.screen.waitForText("Ready")
expect(await session.screen.text()).toMatchSnapshot()
```

Artifact and recording configuration is opt-in because terminal output and input may contain secrets. See the repository `README.md` for the complete workflow.
