/**
 * menese_swap — DEX swaps across supported chains.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { swapTokensOnChain } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer, invalidateBalanceCaches } from "./helpers.js";

export function registerSwapTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_swap",
    {
      description:
        "Swap tokens via DEX on supported chains. " +
        "EVM: Uniswap V3 | Solana: Raydium | ICP: ICPSwap/KongSwap | SUI: Cetus | " +
        "Cardano: Minswap | XRP: XRPL DEX.",
      inputSchema: {
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).describe("Chain to swap on"),
        fromToken: z.string().describe("Source token symbol or address"),
        toToken: z.string().describe("Destination token symbol or address"),
        amount: z.string().describe("Amount of fromToken to swap (decimal)"),
        slippageBps: z.number().min(1).max(5000).optional()
          .describe("Slippage tolerance in basis points (default 250 = 2.5%)"),
      },
    },
    async ({ chain, fromToken, toToken, amount, slippageBps }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const result = await swapTokensOnChain(config, identity.seed, {
        chain, fromToken, toToken, amount, slippageBps,
      });

      if (result.ok) {
        invalidateBalanceCaches(identity.principal);
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, bigIntReplacer, 2),
        }],
      };
    },
  );
}
