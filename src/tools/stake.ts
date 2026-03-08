/**
 * menese_stake — Lido staking (stake ETH for stETH).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { stakeOrLend } from "../sdk/ic-client.js";
import { EVM_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer, invalidateBalanceCaches } from "./helpers.js";
import { checkGuard } from "../guards/transaction-guard.js";

export function registerStakeTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_stake",
    {
      description:
        "Stake ETH via Lido protocol on EVM chains. Supports stake (ETH → stETH) and unstake.",
      inputSchema: {
        chain: z.enum(EVM_CHAINS as unknown as [string, ...string[]]).describe("EVM chain"),
        action: z.enum(["stake", "unstake"]).describe("Stake or unstake"),
        protocol: z.string().default("lido").describe("Staking protocol (default: lido)"),
        amount: z.string().describe("Amount of ETH to stake (decimal)"),
        mode: z.enum(["quote", "execute"]).optional()
          .describe("'quote' to preview, 'execute' to stake. Default: execute"),
      },
    },
    async ({ chain, action, protocol, amount, mode }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const guard = checkGuard("menese_stake", { chain, action, amount, mode }, config);
      if (!guard.allowed) {
        return { content: [{ type: "text" as const, text: guard.reason! }], isError: true };
      }

      if (mode === "quote") {
        return {
          content: [{
            type: "text" as const,
            text: `Ready to ${action} ${amount} ETH via ${protocol} on ${chain}. Call again with mode "execute" to confirm.`,
          }],
        };
      }

      const result = await stakeOrLend(config, identity.seed, {
        action, protocol, chain, amount,
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
