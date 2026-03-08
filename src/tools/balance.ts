/**
 * menese_balance — Single chain native balance.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { getChainBalance, getChainBalanceAuthenticated } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { cacheFetch, CacheKeys, TTL } from "../sdk/cache.js";
import { bigIntReplacer } from "./helpers.js";

const AUTH_CHAINS = ["xrp", "cardano", "aptos", "near", "tron", "cloakcoin", "thorchain"];

export function registerBalanceTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_balance",
    {
      description: "Get your native token balance on a specific blockchain.",
      inputSchema: {
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).describe("Blockchain to check"),
      },
    },
    async ({ chain }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const result = await cacheFetch(
        CacheKeys.balance(identity.principal, chain),
        TTL.BALANCE,
        async () => {
          if (AUTH_CHAINS.includes(chain)) {
            return getChainBalanceAuthenticated(config, identity.seed, chain);
          }
          return getChainBalance(config, identity.principal, chain);
        },
      );

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, bigIntReplacer, 2),
        }],
      };
    },
  );
}
