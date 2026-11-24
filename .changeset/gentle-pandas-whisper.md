---
'@mastra/mcp': patch
---

`MCPClient` no longer always advertises the `io.modelcontextprotocol/ui` extension. Headless clients can opt out by setting `capabilities.extensions['io.modelcontextprotocol/ui']` to `false` or `null`; an object value overrides the advertised entry.
