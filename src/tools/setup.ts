/**
 * menese_setup — Generate or import an Ed25519 identity seed.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { generateSeed, getPrincipalFromSeed, getAllAddresses } from "../sdk/ic-client.js";

export function registerSetupTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_setup",
    {
      description:
        "Create or import a Menese wallet. Actions: 'new' generates a fresh wallet, " +
        "'import' restores from an existing hex seed, 'status' shows current wallet info.",
      inputSchema: {
        action: z.enum(["new", "import", "status"]).describe("Action to perform"),
        seed: z.string().length(64).optional().describe("64-char hex seed (for 'import' action only)"),
      },
    },
    async ({ action, seed: importSeed }) => {
      if (action === "status") {
        const current = store.get();
        if (!current) {
          return { content: [{ type: "text" as const, text: "No wallet configured. Use action 'new' to create one or 'import' to restore." }] };
        }
        const addrRes = await getAllAddresses(config, current.principal, current.seed);
        const evm = addrRes.ok ? (addrRes.data.evm?.evmAddress ?? "—") : "—";
        const sol = addrRes.ok ? (addrRes.data.solana?.address ?? "—") : "—";
        const btc = addrRes.ok ? (addrRes.data.bitcoin?.bech32Address ?? "—") : "—";
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              principal: current.principal,
              eth: evm,
              sol,
              btc,
              agentCanisterId: current.agentCanisterId ?? null,
            }, null, 2),
          }],
        };
      }

      let seed: string;
      if (action === "import") {
        if (!importSeed || !/^[0-9a-fA-F]{64}$/.test(importSeed)) {
          return {
            content: [{ type: "text" as const, text: "Invalid seed. Expected 64 hex characters (32 bytes)." }],
            isError: true,
          };
        }
        seed = importSeed.toLowerCase();
      } else {
        seed = generateSeed();
      }

      const principal = getPrincipalFromSeed(seed);
      store.set({ seed, principal });

      const addrRes = await getAllAddresses(config, principal, seed);
      const evm = addrRes.ok ? (addrRes.data.evm?.evmAddress ?? "—") : "—";
      const sol = addrRes.ok ? (addrRes.data.solana?.address ?? "—") : "—";
      const btc = addrRes.ok ? (addrRes.data.bitcoin?.bech32Address ?? "—") : "—";

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: action === "import" ? "Wallet imported" : "Wallet created",
            principal,
            eth: evm,
            sol,
            btc,
            seed: action === "new" ? seed : undefined,
          }, null, 2),
        }],
      };
    },
  );
}
