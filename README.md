# Menese MCP Server

MCP server for the Menese SDK — 19-chain DeFi gateway for AI assistants.

## Install

```bash
claude mcp add menese -- npx @menese/mcp-server
```

Or add to your MCP config (`claude_desktop_config.json`, `.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "menese": {
      "command": "npx",
      "args": ["-y", "@menese/mcp-server"]
    }
  }
}
```

## Tools

`menese_setup` · `menese_portfolio` · `menese_balance` · `menese_prices` · `menese_quote` · `menese_send` · `menese_swap` · `menese_stake` · `menese_lend` · `menese_strategy` · `menese_jobs`

## License

MIT
