/**
 * menese_prices — Token USD prices via CoinGecko.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cacheFetch, CacheKeys, TTL } from "../sdk/cache.js";

const COINGECKO_IDS: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana",
  icp: "internet-computer",
  matic: "matic-network", polygon: "matic-network",
  bnb: "binancecoin",
  avax: "avalanche-2",
  ada: "cardano", cardano: "cardano",
  xrp: "ripple",
  sui: "sui",
  ton: "the-open-network",
  apt: "aptos", aptos: "aptos",
  near: "near",
  trx: "tron", tron: "tron",
  ltc: "litecoin", litecoin: "litecoin",
  rune: "thorchain", thorchain: "thorchain",
  cloak: "cloakcoin", cloakcoin: "cloakcoin",
  usdc: "usd-coin", usdt: "tether",
  menes: "menes-token",
};

export function registerPricesTool(server: McpServer): void {
  server.registerTool(
    "menese_prices",
    {
      description:
        "Get current USD prices for crypto tokens. Supports: BTC, ETH, SOL, ICP, MATIC, BNB, " +
        "ADA, XRP, SUI, TON, APT, NEAR, TRX, LTC, RUNE, CLOAK, USDC, USDT, and more.",
      inputSchema: {
        tokens: z.array(z.string()).min(1).max(20).describe("Token symbols (e.g. ['BTC', 'ETH', 'SOL'])"),
      },
    },
    async ({ tokens }) => {
      const ids = tokens
        .map((t) => COINGECKO_IDS[t.toLowerCase()])
        .filter(Boolean);

      if (ids.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No recognized tokens. Try: BTC, ETH, SOL, ICP, etc." }],
          isError: true,
        };
      }

      const idStr = [...new Set(ids)].sort().join(",");
      const prices = await cacheFetch(
        CacheKeys.prices(idStr),
        TTL.PRICES,
        async () => {
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idStr}&vs_currencies=usd&include_24hr_change=true`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
          return res.json() as Promise<Record<string, { usd: number; usd_24h_change?: number }>>;
        },
      );

      // Map back to user's token symbols
      const result: Record<string, { usd: number; change24h?: number }> = {};
      for (const token of tokens) {
        const id = COINGECKO_IDS[token.toLowerCase()];
        if (id && prices[id]) {
          result[token.toUpperCase()] = {
            usd: prices[id].usd,
            change24h: prices[id].usd_24h_change,
          };
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );
}
