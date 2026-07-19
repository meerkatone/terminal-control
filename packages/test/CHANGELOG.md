# @kitlangton/terminal-control

## 0.4.1

### Patch Changes

- 1d41583: Update package README: remove stale pre-publication phrasing and point to the full client documentation in the repository docs.
- c1d37db: Make MCP screen reads and interactions return immediately by default, preventing animated terminal output from delaying control requests until the capture deadline.

## 0.4.0

### Minor Changes

- 797b975: Add `termctrl run` for visible foreground sessions, including optional names inferred from the executable basename, and add `termctrl mcp` for structured agent control through the official Rust MCP SDK.

## 0.3.1

### Patch Changes

- Refresh dependencies and make retained-output byte-limit checks overflow-safe.

## 0.3.0

### Minor Changes

- 43acebe: Add an optional `termctrl video --footer` overlay for polished terminal recordings, and reorganize the README around agent-first terminal-control usage.

## 0.2.0

### Minor Changes

- Add marker-based recording inspection and video edit plans for polished terminal demos.
