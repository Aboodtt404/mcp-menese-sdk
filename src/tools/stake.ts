/**
 * menese_stake — coming soon.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EVM_CHAINS } from "../sdk/chains.js";

export function registerStakeTool(server: McpServer): void {
  server.registerTool(
    "menese_stake",
    {
      description: "[Coming soon] Stake ETH via Lido protocol on EVM chains.",
      inputSchema: {
        chain: z.enum(EVM_CHAINS as unknown as [string, ...string[]]).describe("EVM chain"),
        action: z.enum(["stake", "unstake"]).describe("Stake or unstake"),
        protocol: z.string().default("lido").describe("Staking protocol"),
        amount: z.string().describe("Amount of ETH (decimal)"),
      },
    },
    async () => {
      return { content: [{ type: "text" as const, text: "Staking is coming soon." }] };
    },
  );
}
