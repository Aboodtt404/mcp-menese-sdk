/**
 * menese_portfolio — Full multi-chain portfolio.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { getPortfolio, getAllICRC1Balances } from "../sdk/ic-client.js";
import { cacheFetch, CacheKeys, TTL } from "../sdk/cache.js";
import { bigIntReplacer } from "./helpers.js";

export function registerPortfolioTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_portfolio",
    {
      description:
        "Get your full portfolio across all 19 supported blockchains (EVM, Solana, Bitcoin, ICP, etc.) " +
        "plus ICP ecosystem tokens (ckBTC, ckETH, ckUSDC). Requires a configured wallet.",
      inputSchema: {},
    },
    async () => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const portfolio = await cacheFetch(
        CacheKeys.portfolio(identity.principal),
        TTL.PORTFOLIO,
        async () => {
          const [native, icrc1] = await Promise.all([
            getPortfolio(config, identity.principal, identity.seed),
            getAllICRC1Balances(config, identity.seed),
          ]);
          return { native, icrc1Tokens: icrc1 };
        },
      );

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(portfolio, bigIntReplacer, 2),
        }],
      };
    },
  );
}
