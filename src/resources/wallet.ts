/**
 * MCP Resources — wallet status, addresses, and chain balances.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { getAllAddresses, getChainBalance } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer } from "../tools/helpers.js";

export function registerWalletResources(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  // Static: wallet setup status
  server.registerResource(
    "wallet-status",
    "menese://wallet/status",
    { description: "Current wallet identity status", mimeType: "application/json" },
    async () => {
      const identity = store.get();
      const data = identity
        ? { setup: true, principal: identity.principal, hasAgent: !!identity.agentCanisterId }
        : { setup: false };
      return { contents: [{ uri: "menese://wallet/status", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // Static: all wallet addresses
  server.registerResource(
    "wallet-addresses",
    "menese://wallet/addresses",
    { description: "Wallet addresses across all 19 chains", mimeType: "application/json" },
    async () => {
      const identity = store.get();
      if (!identity) {
        return { contents: [{ uri: "menese://wallet/addresses", text: JSON.stringify({ error: "No wallet configured" }) }] };
      }
      const addresses = await getAllAddresses(config, identity.seed);
      return { contents: [{ uri: "menese://wallet/addresses", text: JSON.stringify(addresses, bigIntReplacer, 2) }] };
    },
  );

  // Template: per-chain balance
  const balanceTemplate = new ResourceTemplate("menese://wallet/balance/{chain}", {
    list: async () => ({
      resources: SUPPORTED_CHAINS.map(c => ({
        uri: `menese://wallet/balance/${c}`,
        name: `${c} balance`,
        mimeType: "application/json",
      })),
    }),
    complete: {
      chain: async (value: string) =>
        SUPPORTED_CHAINS.filter(c => c.startsWith(value)),
    },
  });

  server.registerResource(
    "chain-balance",
    balanceTemplate,
    { description: "Balance for a specific chain", mimeType: "application/json" },
    async (uri, variables) => {
      const chain = variables.chain as string;
      const identity = store.get();
      if (!identity) {
        return { contents: [{ uri: uri.href, text: JSON.stringify({ error: "No wallet configured" }) }] };
      }
      const balance = await getChainBalance(config, identity.seed, chain);
      return { contents: [{ uri: uri.href, text: JSON.stringify(balance, bigIntReplacer, 2) }] };
    },
  );
}
