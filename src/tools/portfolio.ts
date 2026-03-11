/**
 * menese_portfolio — Full multi-chain portfolio.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { getPortfolio, getAllICRC1Balances, type BalanceResult } from "../sdk/ic-client.js";
import { cacheFetch, CacheKeys, TTL } from "../sdk/cache.js";

const CHAIN_LABEL: Record<string, string> = {
  ethereum: "Ethereum", polygon: "Polygon", arbitrum: "Arbitrum",
  base: "Base", optimism: "Optimism", bnb: "BNB Chain",
  solana: "Solana", bitcoin: "Bitcoin", litecoin: "Litecoin",
  icp: "ICP", sui: "SUI", ton: "TON", xrp: "XRP",
  cardano: "Cardano", tron: "TRON", aptos: "Aptos",
  near: "NEAR", cloakcoin: "CloakCoin", thorchain: "THORChain",
};

function isSubscriptionError(err: string): boolean {
  const lower = err.toLowerCase();
  return lower.includes("subscription") || lower.includes("unauthorized")
    || lower.includes("access denied") || lower.includes("not subscribed")
    || lower.includes("tier") || lower.includes("403");
}

function formatBalance(b: BalanceResult): string {
  const addr = b.address.length > 16
    ? `${b.address.slice(0, 8)}...${b.address.slice(-6)}`
    : b.address;
  return `${CHAIN_LABEL[b.chain] ?? b.chain}: ${b.balance} ${b.symbol} (${addr})`;
}

export function registerPortfolioTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_portfolio",
    {
      description:
        "Get your full portfolio across all 19 supported blockchains (EVM, Solana, Bitcoin, ICP, etc.) " +
        "plus ICP ecosystem tokens (ckBTC, ckETH, ckUSDC). Requires a configured wallet.",
      inputSchema: {},
    },
    async () => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const portfolio = await cacheFetch(
        CacheKeys.portfolio(identity.principal),
        TTL.PORTFOLIO,
        async () => {
          const [native, icrc1] = await Promise.all([
            getPortfolio(config, identity.principal, identity.seed),
            getAllICRC1Balances(config, identity.seed),
          ]);
          return { native, icrc1Tokens: icrc1 };
        },
      );

      const lines: string[] = [];

      // Native balances
      if (portfolio.native.ok) {
        const { data: balances, errors } = portfolio.native;

        if (balances.length > 0) {
          lines.push("## Portfolio Balances\n");
          for (const b of balances) {
            lines.push(`- ${formatBalance(b)}`);
          }
        } else {
          lines.push("## Portfolio Balances\n");
          lines.push("No balances found across supported chains.");
        }

        // Categorize errors
        if (errors && errors.length > 0) {
          const subRequired = errors.filter(e => isSubscriptionError(e.error));
          const other = errors.filter(e => !isSubscriptionError(e.error));

          if (subRequired.length > 0) {
            const chains = subRequired.map(e => CHAIN_LABEL[e.chain] ?? e.chain).join(", ");
            lines.push(`\n## Subscription Required\n`);
            lines.push(`${chains} — balance queries require a Menese subscription.`);
            lines.push(`Upgrade at https://menese.io to unlock full multi-chain access.`);
          }

          if (other.length > 0) {
            lines.push(`\n## Unavailable Chains\n`);
            for (const e of other) {
              lines.push(`- ${CHAIN_LABEL[e.chain] ?? e.chain}: ${e.error}`);
            }
          }
        }
      } else {
        lines.push(`Portfolio fetch failed: ${portfolio.native.error}`);
      }

      // ICRC-1 tokens (ckBTC, ckETH, ckUSDC, etc.)
      if (Array.isArray(portfolio.icrc1Tokens) && portfolio.icrc1Tokens.length > 0) {
        lines.push(`\n## ICP Ecosystem Tokens\n`);
        for (const t of portfolio.icrc1Tokens) {
          lines.push(`- ${t.symbol}: ${t.balance}`);
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );
}
