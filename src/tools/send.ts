/**
 * menese_send — Send tokens on any of 19 supported chains.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { sendToken } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer, invalidateBalanceCaches } from "./helpers.js";

export function registerSendTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_send",
    {
      description:
        "Send native tokens on any supported blockchain. Supports 19 chains: " +
        "Ethereum, Polygon, Arbitrum, Base, Optimism, BNB, Bitcoin, Solana, ICP, " +
        "SUI, TON, XRP, Litecoin, Cardano, Tron, Aptos, NEAR, CloakCoin, Thorchain.",
      inputSchema: {
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).describe("Target blockchain"),
        to: z.string().describe("Recipient address"),
        amount: z.string().describe("Amount to send (decimal, e.g. '0.5')"),
        token: z.string().optional().describe("Token symbol (for ICRC-1 or ERC-20; omit for native token)"),
      },
    },
    async ({ chain, to, amount, token }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const result = await sendToken(config, identity.seed, chain, to, amount, { token });

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
