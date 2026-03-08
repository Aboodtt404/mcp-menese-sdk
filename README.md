# Menese MCP Server

MCP server for the Menese SDK — a 19-chain DeFi gateway. Exposes 11 tools for multi-chain wallet operations via the [Model Context Protocol](https://modelcontextprotocol.io/).

Works with any MCP client: Claude Code, Claude Desktop, Cursor, and more.

## Supported Chains

Bitcoin, Litecoin, Ethereum, Arbitrum, Base, Polygon, BNB, Optimism, Solana, SUI, TON, Tron, XRP, Aptos, Cardano, NEAR, ICP, CloakCoin, Thorchain.

## Tools

| Tool | Description |
|------|-------------|
| `menese_setup` | Create or import wallet identity |
| `menese_portfolio` | Full multi-chain portfolio |
| `menese_balance` | Single chain balance |
| `menese_prices` | Token USD prices (CoinGecko) |
| `menese_quote` | Swap quotes, addresses, balance queries |
| `menese_send` | Send tokens (19 chains) |
| `menese_swap` | DEX swaps (EVM/Solana/ICP/SUI/Cardano/XRP) |
| `menese_stake` | Lido staking (EVM) |
| `menese_lend` | Aave V3 supply/withdraw (EVM) |
| `menese_strategy` | DCA / Take Profit / Stop Loss rules |
| `menese_jobs` | On-chain agent job scheduling |

## Installation

### Claude Code

```bash
claude mcp add menese -- npx @menese/mcp-server
```

### Claude Desktop

Add to `claude_desktop_config.json`:

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

### Cursor

Add to `.cursor/mcp.json`:

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

### From Source

```bash
git clone https://github.com/Aboodtt404/mcp-menese-sdk.git
cd mcp-menese-sdk
npm install
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MENESE_SEED` | 64-char hex Ed25519 seed (overrides file store) | No |
| `MENESE_SDK_CANISTER_ID` | SDK canister ID (defaults to production) | No |
| `MENESE_AGENT_CANISTER_ID` | Agent canister for job scheduling | No |
| `MENESE_RELAY_URL` | VPS relay endpoint | No |
| `MENESE_DEVELOPER_KEY` | API key for relay | No |
| `MENESE_TEST_MODE` | Use test SDK canister (`"true"` to enable) | No |

## Quick Start

1. Set up a wallet:
   > "Create a new Menese wallet"

2. Check your portfolio:
   > "Show my portfolio across all chains"

3. Send tokens:
   > "Send 0.01 ETH to 0x..."

4. Swap tokens:
   > "Swap 100 USDC to ETH on Base"

5. Set up DCA:
   > "Create a DCA strategy to buy ETH weekly with 50 USDC"

## How It Works

The MCP server runs locally on your machine via stdio transport. Your private keys (Ed25519 seed) are stored locally at `~/.menese-mcp/identity.json` and never leave your machine.

All blockchain operations are executed through the Menese SDK canister on the Internet Computer, which handles multi-chain address derivation, transaction signing, and broadcasting.

## License

MIT
