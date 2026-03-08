/**
 * MCP server configuration — parsed from environment variables.
 */

import { SDK_CANISTER_ID, SDK_TEST_STAGING_CANISTER_ID } from "./sdk/canisters.js";

export interface MeneseConfig {
  sdkCanisterId: string;
  relayUrl: string;
  autoApproveThreshold: number;
  developerKey?: string;
  agentCanisterId?: string;
  testMode: boolean;
}

export function loadConfig(): MeneseConfig {
  const testMode = process.env.MENESE_TEST_MODE === "true";
  return {
    sdkCanisterId: process.env.MENESE_SDK_CANISTER_ID
      ?? (testMode ? SDK_TEST_STAGING_CANISTER_ID : SDK_CANISTER_ID),
    relayUrl: process.env.MENESE_RELAY_URL ?? "http://localhost:18791",
    autoApproveThreshold: Number(process.env.MENESE_AUTO_APPROVE_THRESHOLD ?? "0"),
    developerKey: process.env.MENESE_DEVELOPER_KEY,
    agentCanisterId: process.env.MENESE_AGENT_CANISTER_ID,
    testMode,
  };
}
