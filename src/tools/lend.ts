/**
 * menese_lend — Aave V3 supply/withdraw on EVM chains.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { stakeOrLend } from "../sdk/ic-client.js";
import { EVM_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer, invalidateBalanceCaches } from "./helpers.js";

export function registerLendTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_lend",
    {
      description:
        "Supply or withdraw assets on Aave V3 (EVM chains). Supply earns yield; withdraw retrieves your funds.",
      inputSchema: {
        chain: z.enum(EVM_CHAINS as unknown as [string, ...string[]]).describe("EVM chain"),
        action: z.enum(["supply", "withdraw"]).describe("Supply or withdraw"),
        asset: z.string().describe("Asset to supply/withdraw (e.g. 'ETH', 'USDC')"),
        amount: z.string().describe("Amount (decimal)"),
      },
    },
    async ({ chain, action, asset, amount }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const result = await stakeOrLend(config, identity.seed, {
        action, protocol: "aave", chain, asset, amount,
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
