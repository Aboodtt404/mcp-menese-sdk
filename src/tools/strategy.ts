/**
 * menese_strategy — SDK rules: DCA, Take Profit, Stop Loss.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MeneseConfig } from "../config.js";
import type { IdentityStore } from "../store.js";
import { addStrategy, listStrategies, deleteStrategy, CHAIN_DECIMALS } from "../sdk/ic-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { bigIntReplacer } from "./helpers.js";

const CHAIN_TYPE_MAP: Record<string, Record<string, null>> = {
  bitcoin: { Bitcoin: null }, litecoin: { Litecoin: null }, ethereum: { Ethereum: null },
  arbitrum: { Arbitrum: null }, base: { Base: null }, polygon: { Polygon: null },
  bnb: { BNB: null }, optimism: { Optimism: null }, solana: { Solana: null },
  sui: { Sui: null }, ton: { TON: null }, tron: { Tron: null },
  xrp: { XRP: null }, aptos: { Aptos: null }, cardano: { Cardano: null },
  near: { NEAR: null }, icp: { ICP: null }, cloakcoin: { CloakCoin: null },
  thorchain: { Thorchain: null },
};

const RULE_TYPE_MAP: Record<string, Record<string, null>> = {
  dca: { DCA: null },
  take_profit: { TakeProfit: null },
  stop_loss: { StopLoss: null },
};

export function registerStrategyTool(
  server: McpServer,
  store: IdentityStore,
  config: MeneseConfig,
): void {
  server.registerTool(
    "menese_strategy",
    {
      description:
        "Manage automated trading strategies: DCA (dollar-cost averaging), " +
        "Take Profit (sell above target), Stop Loss (sell below threshold).",
      inputSchema: {
        action: z.enum(["create", "list", "cancel"]).describe("Action to perform"),
        strategyType: z.enum(["dca", "take_profit", "stop_loss"]).optional()
          .describe("Strategy type (required for create)"),
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).optional()
          .describe("Target chain (required for create)"),
        amount: z.string().optional().describe("Amount per execution (decimal, for create)"),
        intervalSeconds: z.number().min(60).optional()
          .describe("Interval between DCA executions in seconds (min 60)"),
        maxExecutions: z.number().min(1).optional()
          .describe("Max number of executions"),
        targetPrice: z.string().optional()
          .describe("Target price in USD (for take_profit/stop_loss)"),
        ruleId: z.number().optional().describe("Rule ID (for cancel)"),
      },
    },
    async ({ action, strategyType, chain, amount, intervalSeconds, maxExecutions, targetPrice, ruleId }) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      if (action === "list") {
        const result = await listStrategies(config, identity.seed);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, bigIntReplacer, 2),
          }],
        };
      }

      if (action === "cancel") {
        if (ruleId == null) {
          return { content: [{ type: "text" as const, text: "ruleId is required for cancel." }], isError: true };
        }
        const result = await deleteStrategy(config, identity.seed, ruleId);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, bigIntReplacer, 2),
          }],
        };
      }

      // action === "create"
      if (!strategyType || !chain || !amount) {
        return {
          content: [{ type: "text" as const, text: "strategyType, chain, and amount are required for create." }],
          isError: true,
        };
      }

      const chainType = CHAIN_TYPE_MAP[chain];
      const ruleType = RULE_TYPE_MAP[strategyType];
      if (!chainType || !ruleType) {
        return { content: [{ type: "text" as const, text: "Invalid chain or strategy type." }], isError: true };
      }

      const decimals = CHAIN_DECIMALS[chain] ?? 18;
      const triggerPrice = targetPrice ? BigInt(Math.round(parseFloat(targetPrice) * 1_000_000)) : 0n;

      // Build the Candid Rule record
      const rule: Record<string, unknown> = {
        chainType,
        ruleType,
        triggerPrice,
        sizePct: 100n,
        positionId: 0n,
        id: 0n,
        status: { Draft: null },
        createdAt: BigInt(Date.now()) * 1_000_000n,
        apyMigrationConfig: [],
        lpConfig: [],
        scheduledConfig: [],
        volatilityConfig: [],
        swapAmountDrops: [],
        swapAmountLamports: [],
        swapAmountWei: [],
        dcaConfig: [],
      };

      // Set chain-specific amount field
      if (chain === "solana") {
        rule.swapAmountLamports = [parseAmount(amount, 9)];
      } else if (chain === "xrp") {
        rule.swapAmountDrops = [parseAmount(amount, 6)];
      } else {
        rule.swapAmountWei = [parseAmount(amount, decimals)];
      }

      // DCA config
      if (strategyType === "dca" && intervalSeconds) {
        rule.dcaConfig = [{ intervalSeconds: BigInt(intervalSeconds), maxExecutions: maxExecutions ? [BigInt(maxExecutions)] : [] }];
      }

      const result = await addStrategy(config, identity.seed, rule);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, bigIntReplacer, 2),
        }],
      };
    },
  );
}

function parseAmount(value: string, decimals: number): bigint {
  const parts = value.split(".");
  const whole = parts[0] ?? "0";
  let frac = parts[1] ?? "";
  if (frac.length > decimals) frac = frac.slice(0, decimals);
  frac = frac.padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac);
}
