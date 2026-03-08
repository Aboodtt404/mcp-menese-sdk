/**
 * Transaction guard — 3-layer protection for financial tools.
 *
 * 1. Rate limit check: warns when approaching SDK rate limits
 * 2. Quote enforcement: blocks execute calls without prior quote
 * 3. Threshold check: blocks amounts above autoApproveThreshold
 */

import type { MeneseConfig } from "../config.js";

const GUARDED_TOOLS = new Set([
  "menese_send",
  "menese_swap",
  "menese_stake",
  "menese_lend",
  "menese_strategy",
  "menese_jobs",
]);

// Track quoted operations (fingerprint → timestamp)
const quotedOperations = new Set<string>();

// Rate tracking
let requestsThisMinute = 0;
let sdkCallsThisHour = 0;
let minuteResetAt = Date.now() + 60_000;
let hourResetAt = Date.now() + 3_600_000;

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

function operationFingerprint(toolName: string, params: Record<string, unknown>): string {
  const parts = [toolName];
  if (params.chain) parts.push(String(params.chain));
  if (params.fromToken) parts.push(String(params.fromToken));
  if (params.toToken) parts.push(String(params.toToken));
  if (params.token) parts.push(String(params.token));
  if (params.asset) parts.push(String(params.asset));
  if (params.to) parts.push(String(params.to));
  return parts.join(":");
}

function formatOperationSummary(toolName: string, params: Record<string, unknown>): string {
  const name = toolName.replace("menese_", "").toUpperCase();
  const amount = params.amount ?? params.amountA ?? "";
  const token = params.token ?? params.asset ?? params.fromToken ?? "";
  const chain = params.chain ?? "";

  const parts = [name];
  if (amount) parts.push(String(amount));
  if (token) parts.push(String(token));
  if (params.toToken) parts.push(`→ ${params.toToken}`);
  if (chain) parts.push(`on ${chain}`);
  if (params.to) parts.push(`to ${String(params.to).slice(0, 10)}...`);

  return parts.join(" ");
}

function checkRateLimits(): GuardResult {
  const now = Date.now();
  if (now > minuteResetAt) {
    requestsThisMinute = 0;
    minuteResetAt = now + 60_000;
  }
  if (now > hourResetAt) {
    sdkCallsThisHour = 0;
    hourResetAt = now + 3_600_000;
  }

  requestsThisMinute++;
  sdkCallsThisHour++;

  if (requestsThisMinute > 50 || sdkCallsThisHour > 180) {
    return {
      allowed: false,
      reason:
        `Rate limit warning: ${requestsThisMinute}/60 requests this minute, ` +
        `${sdkCallsThisHour}/200 SDK calls this hour. ` +
        `Please wait before making more transactions.`,
    };
  }

  return { allowed: true };
}

export function checkGuard(
  toolName: string,
  params: Record<string, unknown>,
  config: MeneseConfig,
): GuardResult {
  if (!GUARDED_TOOLS.has(toolName)) return { allowed: true };

  // Strategy/jobs: only guard "create" action
  if (toolName === "menese_strategy" && params.action !== "create") return { allowed: true };
  if (toolName === "menese_jobs" && params.action !== "create") return { allowed: true };

  const mode = params.mode as string | undefined;
  const fingerprint = operationFingerprint(toolName, params);

  // Layer 1: Rate limits
  const rateCheck = checkRateLimits();
  if (!rateCheck.allowed) return rateCheck;

  // Layer 2: Quote enforcement
  if (mode === "quote") {
    quotedOperations.add(fingerprint);
    return { allowed: true };
  }

  if (mode === "execute" && !quotedOperations.has(fingerprint)) {
    return {
      allowed: false,
      reason:
        `Please fetch a quote first so the user can review fees before executing. ` +
        `Call ${toolName} with mode "quote" first, present the result, ` +
        `then call again with mode "execute" after confirmation.`,
    };
  }

  // Clear quote after execute (one-time use)
  if (mode === "execute") {
    quotedOperations.delete(fingerprint);
  }

  // Layer 3: Threshold check
  if (config.autoApproveThreshold > 0) {
    const amount = parseFloat(String(params.amount ?? params.amountA ?? "0"));
    if (!isNaN(amount) && amount > config.autoApproveThreshold) {
      const summary = formatOperationSummary(toolName, params);
      return {
        allowed: false,
        reason:
          `Transaction exceeds auto-approve threshold ($${config.autoApproveThreshold}). ` +
          `Operation: ${summary}. Please confirm with the user before proceeding.`,
      };
    }
  }

  return { allowed: true };
}
