# Application Semantic Protocol

Terminal Control can read optional structured UI state from a cooperating application. The
application protocol is separate from terminal output and is available only to commands launched
with the OpenTUI host profile.

## Transport

Terminal Control creates an owner-only Unix stream socket and passes its absolute path to the child
as `TERMCTRL_SEMANTIC_SOCKET`. The variable is reserved: ordinary and nested launches remove any
inherited value, while each `--host opentui` launch receives a fresh socket.

Messages are UTF-8 JSON followed by `\n`. A message may contain at most 8 MiB. The application must
connect and send its handshake within five seconds of the socket being accepted:

```json
{"type":"hello","protocolVersion":1,"application":{"name":"my-tui","version":"1.0.0"},"capabilities":["semantic.snapshot"]}
```

`application.name` is required and nonempty. `application.version` is optional. Terminal Control
accepts protocol version 1 and responds:

```json
{"type":"ready","protocolVersion":1}
```

An incompatible or malformed provider is an error. An application that never connects is treated as
having no semantic provider and produces the empty snapshot.

## Snapshots

Terminal Control sends at most one request at a time on a provider connection:

```json
{"type":"semantic.snapshot","id":1}
```

The application returns the same safe-integer request ID with either a JSON value:

```json
{"type":"result","id":1,"value":{"format":"termctrl-semantic-snapshot-v1","nodes":[]}}
```

or an application error:

```json
{"type":"error","id":1,"error":{"code":"NOT_READY","message":"the UI is still mounting"}}
```

`error.code` and `error.message` must be strings. Terminal Control preserves the provider's JSON
value without imposing an application-specific schema. The official OpenTUI adapter emits
`termctrl-semantic-snapshot-v1`, whose `nodes` contain unique `id`, `role`, optional `label`, numeric
`element`, `focused`, and `disabled` fields.

`termctrl show NAME --format semantic` uses `--deadline-ms` as one absolute deadline across the named
session request and application response; the default is 1000 ms. A timeout closes the provider
connection so a late reply cannot be mistaken for a later request. Providers should reconnect after
an established connection closes. The official OpenTUI adapter does this automatically.

## Security

The socket and its runtime directory are readable only by the current Unix user. Semantic snapshots
are application output and must be treated as untrusted JSON. They may contain sensitive UI state;
do not persist or publish them without the same care as terminal captures and recordings.
