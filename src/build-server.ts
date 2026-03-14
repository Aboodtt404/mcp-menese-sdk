/**
 * Shared McpServer factory — used by both local (stdio) and remote (HTTP) servers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { loadConfig, type MeneseConfig } from "./config.js";
import { createStore, type IdentityStore } from "./store.js";
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

// Resources & Prompts
import { registerWalletResources } from "./resources/wallet.js";
import { registerDeFiPrompts } from "./prompts/defi.js";

const MENESE_INSTRUCTIONS = `You have menese_* tools for multi-chain crypto operations across 19 blockchains.

**Read operations** (no wallet needed for prices):
- menese_portfolio — full portfolio across all chains
- menese_balance — balance for a specific chain
- menese_prices — token USD prices via CoinGecko
- menese_quote — check balances, addresses, or get swap quotes

**Write operations** (wallet required — use menese_setup first):
- menese_send — send tokens (use mode "quote" first, then "execute" after user confirms)
- menese_swap — DEX swaps (use mode "quote" first, then "execute" after user confirms)
- menese_stake — Lido staking on EVM chains
- menese_lend — Aave V3 supply/withdraw on EVM chains

**Automation:**
- menese_strategy — DCA, Take Profit, Stop Loss rules
- menese_jobs — on-chain scheduled jobs (requires agent canister)

**Rules:**
- If no wallet is set up, tell the user to use menese_setup
- For write operations: always quote first, show the user details, then execute after confirmation
- Supported chains: ethereum, polygon, arbitrum, base, optimism, bnb, solana, bitcoin, litecoin, icp, sui, ton, xrp, cardano, tron, aptos, near, cloakcoin, thorchain
- Caching: prices 60s, balances 30s, addresses permanent. Write ops auto-invalidate caches.`;

export interface BuildServerOptions {
  /** Pre-built config. If omitted, loads from env. */
  config?: MeneseConfig;
  /** Pre-built identity store. If omitted, creates local file-based store. */
  store?: IdentityStore;
}

export function buildServer(opts?: BuildServerOptions): McpServer {
  const config = opts?.config ?? loadConfig();
  let store: IdentityStore;

  if (opts?.store) {
    store = opts.store;
  } else {
    const envSeed = process.env.MENESE_SEED;
    const envPrincipal = envSeed ? getPrincipalFromSeed(envSeed) : undefined;
    store = createStore(envSeed, envPrincipal);
  }

  if (config.agentCanisterId && !store.getAgentCanisterId()) {
    store.setAgentCanisterId(config.agentCanisterId);
  }

  const server = new McpServer(
    { name: "menese-sdk", version: "1.0.2" },
    { instructions: MENESE_INSTRUCTIONS },
  );

  registerSetupTool(server, store, config);
  registerPortfolioTool(server, store, config);
  registerBalanceTool(server, store, config);
  registerPricesTool(server);
  registerQuoteTool(server, store, config);
  registerSendTool(server, store, config);
  registerSwapTool(server, store, config);
  registerStakeTool(server);
  registerLendTool(server);
  registerStrategyTool(server, store, config);
  registerJobsTool(server, store);
  registerWalletResources(server, store, config);
  registerDeFiPrompts(server);

  return server;
}
