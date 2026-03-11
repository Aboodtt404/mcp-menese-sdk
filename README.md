# Menese MCP Server

MCP server for the Menese SDK — 19-chain DeFi gateway for AI assistants.

Send, swap, stake, lend, and automate across 19 blockchains from any MCP-compatible AI tool. Non-custodial — your keys never leave your machine.

<a href="https://glama.ai/mcp/servers/Aboodtt404/mcp-menesesdk">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/Aboodtt404/mcp-menesesdk/badge" alt="mcp-menesesdk MCP server" />
</a>

## Install

```bash
npx @menese_protocol/mcp-server
```

### Claude Code

```bash
claude mcp add menese -- npx @menese_protocol/mcp-server
```

### Claude Desktop / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "menese": {
      "command": "npx",
      "args": ["-y", "@menese_protocol/mcp-server"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `menese_setup` | Create or import wallet identity |
| `menese_portfolio` | Full multi-chain portfolio |
| `menese_balance` | Single chain balance |
| `menese_prices` | Token USD prices |
| `menese_quote` | Swap quotes, addresses, balance queries |
| `menese_send` | Send tokens (19 chains) |
| `menese_swap` | DEX swaps |
| `menese_strategy` | DCA / Take Profit / Stop Loss |
| `menese_jobs` | On-chain agent job scheduling |

## Supported Chains

Ethereum · Polygon · Arbitrum · Base · Optimism · BNB · Solana · Bitcoin · Litecoin · ICP · SUI · TON · XRP · Cardano · Tron · Aptos · NEAR · CloakCoin · Thorchain

## License

MIT