#!/usr/bin/env node

/**
 * Menese SDK MCP Server — 19-chain DeFi gateway (stdio transport).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./build-server.js";

// Required by Smithery for capability scanning
export function createSandboxServer() {
  return buildServer();
}

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Menese SDK MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
