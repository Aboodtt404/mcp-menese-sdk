/**
 * menese_jobs — Agent canister job scheduling.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IdentityStore } from "../store.js";
import {
  listAgentJobs,
  createAgentJob,
  pauseAgentJob,
  resumeAgentJob,
  cancelAgentJob,
  recurringJobType,
  conditionalJobType,
  priceAboveCondition,
  priceBelowCondition,
  swapJobAction,
} from "../sdk/agent-client.js";
import { SUPPORTED_CHAINS } from "../sdk/chains.js";
import { CHAIN_DECIMALS } from "../sdk/ic-client.js";
import { bigIntReplacer } from "./helpers.js";

export function registerJobsTool(
  server: McpServer,
  store: IdentityStore,
): void {
  server.registerTool(
    "menese_jobs",
    {
      description:
        "Manage on-chain scheduled jobs via your MeneseAgent canister. " +
        "Jobs persist and execute on-chain (recurring swaps, conditional trades, etc.). " +
        "Requires an agent canister (set MENESE_AGENT_CANISTER_ID env var).",
      inputSchema: {
        action: z.enum(["list", "create", "pause", "resume", "delete"]).describe("Action"),
        name: z.string().optional().describe("Job name (for create)"),
        description: z.string().optional().describe("Job description (for create)"),
        jobType: z.enum(["recurring", "oneshot", "conditional"]).optional()
          .describe("Job type (for create)"),
        intervalSeconds: z.number().min(60).optional()
          .describe("Interval for recurring jobs (seconds, min 60)"),
        chain: z.enum(SUPPORTED_CHAINS as unknown as [string, ...string[]]).optional()
          .describe("Chain for swap action"),
        fromToken: z.string().optional().describe("Source token for swap"),
        toToken: z.string().optional().describe("Destination token for swap"),
        amount: z.string().optional().describe("Swap amount (decimal)"),
        slippageBps: z.number().min(1).max(5000).optional()
          .describe("Slippage in basis points (default 250)"),
        conditionType: z.enum(["price_above", "price_below"]).optional()
          .describe("Condition type (for conditional jobs)"),
        conditionToken: z.string().optional().describe("Token to monitor price of"),
        conditionThreshold: z.string().optional()
          .describe("Price threshold in USD (e.g. '50000')"),
        checkIntervalSeconds: z.number().min(60).optional()
          .describe("How often to check condition (seconds)"),
        allowFundMovement: z.boolean().optional()
          .describe("Allow job to move funds (required for swaps, default false)"),
        maxExecutions: z.number().min(1).optional()
          .describe("Max number of executions"),
        jobId: z.number().optional().describe("Job ID (for pause/resume/delete)"),
      },
    },
    async (params) => {
      const identity = store.get();
      if (!identity) {
        return { content: [{ type: "text" as const, text: "No wallet configured. Use menese_setup first." }], isError: true };
      }

      const agentCanisterId = identity.agentCanisterId ?? store.getAgentCanisterId();
      if (!agentCanisterId) {
        return {
          content: [{
            type: "text" as const,
            text: "No agent canister configured. Set MENESE_AGENT_CANISTER_ID env var.",
          }],
          isError: true,
        };
      }

      if (params.action === "list") {
        const result = await listAgentJobs(agentCanisterId, identity.seed);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, bigIntReplacer, 2) }] };
      }

      if (params.action === "pause") {
        if (params.jobId == null) return { content: [{ type: "text" as const, text: "jobId required." }], isError: true };
        const result = await pauseAgentJob(agentCanisterId, identity.seed, params.jobId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, bigIntReplacer, 2) }] };
      }

      if (params.action === "resume") {
        if (params.jobId == null) return { content: [{ type: "text" as const, text: "jobId required." }], isError: true };
        const result = await resumeAgentJob(agentCanisterId, identity.seed, params.jobId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, bigIntReplacer, 2) }] };
      }

      if (params.action === "delete") {
        if (params.jobId == null) return { content: [{ type: "text" as const, text: "jobId required." }], isError: true };
        const result = await cancelAgentJob(agentCanisterId, identity.seed, params.jobId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, bigIntReplacer, 2) }] };
      }

      // action === "create"
      if (!params.name || !params.jobType) {
        return { content: [{ type: "text" as const, text: "name and jobType required for create." }], isError: true };
      }

      // Build JobType
      let jobType: unknown;
      if (params.jobType === "recurring") {
        if (!params.intervalSeconds) {
          return { content: [{ type: "text" as const, text: "intervalSeconds required for recurring jobs." }], isError: true };
        }
        jobType = recurringJobType(params.intervalSeconds);
      } else if (params.jobType === "conditional") {
        if (!params.conditionType || !params.conditionToken || !params.conditionThreshold) {
          return {
            content: [{ type: "text" as const, text: "conditionType, conditionToken, conditionThreshold required." }],
            isError: true,
          };
        }
        const microUsd = Math.round(parseFloat(params.conditionThreshold) * 1_000_000);
        const condition = params.conditionType === "price_above"
          ? priceAboveCondition(params.conditionToken, microUsd)
          : priceBelowCondition(params.conditionToken, microUsd);
        jobType = conditionalJobType(params.checkIntervalSeconds ?? 300, condition);
      } else {
        // oneshot — execute at current time (immediately)
        jobType = { OneShot: { executeAt: BigInt(Date.now()) * 1_000_000n } };
      }

      // Build JobAction (default: swap)
      if (!params.chain || !params.fromToken || !params.toToken || !params.amount) {
        return {
          content: [{ type: "text" as const, text: "chain, fromToken, toToken, amount required for job action." }],
          isError: true,
        };
      }
      const decimals = CHAIN_DECIMALS[params.chain] ?? 18;
      const amountBigInt = parseAmount(params.amount, decimals);
      const jobAction = swapJobAction(
        params.chain, params.fromToken, params.toToken,
        amountBigInt, params.slippageBps ?? 250,
      );

      const result = await createAgentJob(agentCanisterId, identity.seed, {
        name: params.name,
        description: params.description ?? "",
        jobType,
        action: jobAction,
        allowFundMovement: params.allowFundMovement ?? false,
        maxExecutions: params.maxExecutions,
      });

      return { content: [{ type: "text" as const, text: JSON.stringify(result, bigIntReplacer, 2) }] };
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
