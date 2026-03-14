/**
 * Resolves the actor identity from an IdentityStore.
 * Returns either a hex seed (local mode) or a SignIdentity (remote/II mode).
 */

import type { IdentityStore } from "../store.js";
import type { SeedOrIdentity } from "./ic-client.js";

export function resolveActorIdentity(store: IdentityStore): SeedOrIdentity {
  const identity = store.getIdentity();
  if (identity) return identity;
  const seed = store.getSeed();
  if (seed) return seed;
  throw new Error("No wallet configured. Use menese_setup first.");
}
