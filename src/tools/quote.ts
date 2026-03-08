/**
 * menese_quote — Swap quotes, address derivation, balance queries.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { getAllAddresses, getChainBalance, getSwapQuote } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { cacheFetch, CacheKeys, TTL } from "../sdk/cache.js";
import { bigIntReplacer } from "./helpers.js";

export function registerQuoteTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_quote",
    {
      description:
        "Multi-action tool: get swap quotes, show all derived addresses, or check a single chain balance.",
      inputSchema: {
        action: z.enum(["balance", "addresses", "quote"]).describe("What to fetch"),
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).optional()
          .describe("Blockchain (required for balance/quote)"),
        fromToken: z.string().optional().describe("Source token symbol (for quote)"),
        toToken: z.string().optional().describe("Destination token symbol (for quote)"),
        amount: z.string().optional().describe("Amount to swap (for quote)"),
      },
    },
    async ({ action, chain, fromToken, toToken, amount }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      if (action === "addresses") {
        const addresses = await cacheFetch(
          CacheKeys.addresses(identity.principal),
          TTL.ADDRESSES,
          () => getAllAddresses(config, identity.principal, identity.seed),
        );
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(addresses, bigIntReplacer, 2),
          }],
        };
      }

      if (action === "balance") {
        if (!chain) {
          return { content: [{ type: "text" as const, text: "chain is required for balance action." }], isError: true };
        }
        const result = await cacheFetch(
          CacheKeys.balance(identity.principal, chain),
          TTL.BALANCE,
          () => getChainBalance(config, identity.principal, chain),
        );
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, bigIntReplacer, 2),
          }],
        };
      }

      // action === "quote"
      if (!chain || !fromToken || !toToken || !amount) {
        return {
          content: [{ type: "text" as const, text: "chain, fromToken, toToken, and amount are required for quote." }],
          isError: true,
        };
      }
      const quoteResult = await getSwapQuote(config, identity.seed, {
        chain, fromToken, toToken, amount,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(quoteResult, bigIntReplacer, 2),
        }],
      };
    },
  );
}
