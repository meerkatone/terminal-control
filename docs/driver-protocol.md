# External Driver Protocol

External agent tooling can keep multiple embedded sessions alive through a versioned JSON Lines protocol over stdin/stdout:

```bash
termctrl driver
```

The driver writes a `hello` message with protocol and Terminal Control versions, then accepts typed operations: `launch`, `status`, `send`, `waitForText`, `waitForIdle`, `waitForExit`, `capture`, `logs`, `recording`, `resize`, `stop`, and `shutdown`. It is intended for clients such as the TypeScript test client, while the shell-facing flat commands remain convenient for individual workflows.

## Example Exchange

```json
{"type":"hello","protocolVersion":1,"terminalControlVersion":"<installed-version>"}
{"id":1,"method":"launch","sessionId":"app","params":{"command":["my-terminal-app"],"cols":100,"rows":30,"inheritEnv":false,"env":{"TERM":"xterm-256color"}}}
{"id":2,"method":"waitForText","sessionId":"app","params":{"text":"Ready","timeoutMs":5000}}
{"id":3,"method":"send","sessionId":"app","params":{"input":[{"type":"text","value":"help"},{"type":"key","value":"enter"}]}}
{"id":4,"method":"capture","sessionId":"app","params":{"settleMs":250,"deadlineMs":5000}}
```

## Capture Semantics

A driver `capture` response contains a structured visible frame, derived `text`, and a completion `reason`: `idle`, `deadline`, `exited`, or `outputclosed`. A test client should normally require `idle` or `exited` instead of accepting a deadline fallback as a stable snapshot.

Raw ANSI is omitted by default; request `includeAnsi: true` for retained transcript bytes or `includeSvg: true` for rendered visual evidence.

## Input Semantics

Driver input is intentionally exact: text, raw bytes, known key values, and single-letter control input are supported without claiming unimplemented key chords.
