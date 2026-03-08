/**
 * Single-user identity store for MCP server.
 * Persists to ~/.menese-mcp/identity.json
 *
 * Supports:
 * - Environment variable seed (MENESE_SEED) — loaded at startup
 * - File-based persistence — via menese_setup tool
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface StoredIdentity {
  seed: string;          // 64-char hex Ed25519 seed
  principal: string;     // Derived ICP principal
  agentCanisterId?: string;
}

const STORE_DIR = path.join(os.homedir(), ".menese-mcp");
const STORE_FILE = path.join(STORE_DIR, "identity.json");

function load(): StoredIdentity | null {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.seed && parsed.principal) {
      return parsed as StoredIdentity;
    }
  } catch {
    // File doesn't exist or is malformed
  }
  return null;
}

function save(identity: StoredIdentity): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(identity, null, 2) + "\n", "utf-8");
}

export interface IdentityStore {
  get(): StoredIdentity | null;
  set(identity: StoredIdentity): void;
  clear(): void;
  getSeed(): string | null;
  getPrincipal(): string | null;
  getAgentCanisterId(): string | null;
  setAgentCanisterId(canisterId: string): void;
}

export function createStore(envSeed?: string, envPrincipal?: string): IdentityStore {
  // In-memory cache of current identity
  let current: StoredIdentity | null = null;

  // Try loading from file first
  current = load();

  // Env var overrides file store if present
  if (envSeed && envPrincipal) {
    current = {
      seed: envSeed,
      principal: envPrincipal,
      agentCanisterId: current?.agentCanisterId,
    };
  }

  return {
    get() {
      return current;
    },

    set(identity) {
      current = identity;
      save(identity);
    },

    clear() {
      current = null;
      try { fs.unlinkSync(STORE_FILE); } catch { /* ok */ }
    },

    getSeed() {
      return current?.seed ?? null;
    },

    getPrincipal() {
      return current?.principal ?? null;
    },

    getAgentCanisterId() {
      return current?.agentCanisterId ?? null;
    },

    setAgentCanisterId(canisterId: string) {
      if (current) {
        current.agentCanisterId = canisterId;
        save(current);
      }
    },
  };
}
