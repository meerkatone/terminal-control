---
"@kitlangton/terminal-control": patch
---

Make MCP screen reads and interactions return immediately by default, preventing animated terminal output from delaying control requests until the capture deadline.
