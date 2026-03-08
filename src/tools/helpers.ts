/**
 * Shared helpers for MCP tool handlers.
 */

import { cacheInvalidate, CacheKeys } from "../sdk/cache.js";

/** JSON replacer that converts BigInt to string (BigInt is not serializable). */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Invalidate all cached balances/portfolio for a principal after a write operation. */
export function invalidateBalanceCaches(principal: string): void {
  cacheInvalidate(CacheKeys.userBalances(principal));
  cacheInvalidate(CacheKeys.userPortfolio(principal));
}
