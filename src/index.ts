#!/usr/bin/env node

/**
 * Menese SDK MCP Server — 19-chain DeFi gateway.
 *
 * Exposes 11 tools for multi-chain wallet operations:
 * - menese_setup: Create or import wallet identity
 * - menese_portfolio: Full multi-chain portfolio
 * - menese_balance: Single chain balance
 * - menese_prices: Token USD prices (CoinGecko)
 * - menese_quote: Swap quotes, addresses, balance queries
 * - menese_send: Send tokens (19 chains)
 * - menese_swap: DEX swaps (EVM/Solana/ICP/SUI/Cardano/XRP)
 * - menese_stake: Lido staking (EVM)
 * - menese_lend: Aave V3 supply/withdraw (EVM)
 * - menese_strategy: DCA/Take Profit/Stop Loss rules
 * - menese_jobs: On-chain agent job scheduling
 *
 * Transport: stdio (for Claude Code, Claude Desktop, Cursor, etc.)
 *
 * Environment variables:
 *   MENESE_SEED               — 64-char hex Ed25519 seed (optional, overrides file store)
 *   MENESE_SDK_CANISTER_ID    — SDK canister (default: production)
 *   MENESE_AGENT_CANISTER_ID  — Agent canister for job scheduling
 *   MENESE_RELAY_URL          — VPS relay endpoint
 *   MENESE_DEVELOPER_KEY      — API key for relay
 *   MENESE_TEST_MODE          — Use test SDK canister ("true" to enable)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { createStore } from "./store.js";
import { getPrincipalFromSeed } from "./sdk/ic-client.js";

// Tools
import { registerSetupTool } from "./tools/setup.js";
import { registerPortfolioTool } from "./tools/portfolio.js";
import { registerBalanceTool } from "./tools/balance.js";
import { registerPricesTool } from "./tools/prices.js";
import { registerQuoteTool } from "./tools/quote.js";
import { registerSendTool } from "./tools/send.js";
import { registerSwapTool } from "./tools/swap.js";
import { registerStakeTool } from "./tools/stake.js";
import { registerLendTool } from "./tools/lend.js";
import { registerStrategyTool } from "./tools/strategy.js";
import { registerJobsTool } from "./tools/jobs.js";

async function main() {
  const config = loadConfig();

  // Initialize store — env seed takes priority over file
  const envSeed = process.env.MENESE_SEED;
  const envPrincipal = envSeed ? getPrincipalFromSeed(envSeed) : undefined;
  const store = createStore(envSeed, envPrincipal);

  // Wire agent canister from env if not already in store
  if (config.agentCanisterId && !store.getAgentCanisterId()) {
    store.setAgentCanisterId(config.agentCanisterId);
  }

  const server = new McpServer({
    name: "menese-sdk",
    version: "1.0.0",
  });

  // Register all 11 tools
  registerSetupTool(server, store, config);
  registerPortfolioTool(server, store, config);
  registerBalanceTool(server, store, config);
  registerPricesTool(server);
  registerQuoteTool(server, store, config);
  registerSendTool(server, store, config);
  registerSwapTool(server, store, config);
  registerStakeTool(server, store, config);
  registerLendTool(server, store, config);
  registerStrategyTool(server, store, config);
  registerJobsTool(server, store);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Menese SDK MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
