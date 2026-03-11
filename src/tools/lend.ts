/**
 * menese_lend — coming soon.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EVM_CHAINS } from "../sdk/chains.js";

export function registerLendTool(server: McpServer): void {
  server.registerTool(
    "menese_lend",
    {
      description: "[Coming soon] Supply or withdraw assets on Aave V3 (EVM chains).",
      inputSchema: {
        chain: z.enum(EVM_CHAINS as unknown as [string, ...string[]]).describe("EVM chain"),
        action: z.enum(["supply", "withdraw"]).describe("Supply or withdraw"),
        asset: z.string().describe("Asset (e.g. 'ETH', 'USDC')"),
        amount: z.string().describe("Amount (decimal)"),
      },
    },
    async () => {
      return { content: [{ type: "text" as const, text: "Lending is coming soon." }] };
    },
  );
}
