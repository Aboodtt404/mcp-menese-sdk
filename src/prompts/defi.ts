/**
 * MCP Prompts — pre-built prompt templates for common DeFi operations.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDeFiPrompts(server: McpServer): void {
  server.registerPrompt(
    "portfolio-review",
    {
      description: "Review portfolio and suggest optimizations",
    },
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Review my Menese wallet portfolio. " +
            "Call menese_portfolio to get all balances, then analyze: " +
            "total value across chains, distribution breakdown, largest holdings, " +
            "and any suggestions for rebalancing or yield optimization.",
        },
      }],
    }),
  );

  server.registerPrompt(
    "swap-tokens",
    {
      description: "Quote and execute a token swap",
      argsSchema: {
        fromToken: z.string().describe("Token to sell"),
        toToken: z.string().describe("Token to buy"),
        chain: z.string().describe("Chain to swap on"),
      },
    },
    async ({ fromToken, toToken, chain }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `I want to swap ${fromToken} to ${toToken} on ${chain}. ` +
            `First get a quote using menese_swap with mode "quote", show me the details, ` +
            `then execute after I confirm.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "setup-dca",
    {
      description: "Set up a dollar-cost averaging strategy",
      argsSchema: {
        token: z.string().describe("Token to accumulate"),
        amount: z.string().describe("Amount per buy"),
        interval: z.string().describe("Buy interval (e.g. 'daily', 'weekly')"),
      },
    },
    async ({ token, amount, interval }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Set up a DCA strategy to buy ${token} with ${amount} USD ${interval}. ` +
            `Use menese_strategy with action "create", strategyType "dca". ` +
            `Show me the configuration before creating it.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "security-check",
    {
      description: "Verify wallet status and review balances",
    },
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Run a security check on my Menese wallet. " +
            "1) Verify wallet status with menese_setup (action: status). " +
            "2) Check balances across all chains with menese_portfolio. " +
            "3) Report any anomalies or concerns.",
        },
      }],
    }),
  );
}
