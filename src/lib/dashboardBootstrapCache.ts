import type { SavedState } from "@/src/lib/bloodwiseDb"
import type { SubscriptionRow } from "@/src/lib/bloodwiseDb"

/** Short-lived cache so dashboard sub-routes (Plan, Report) skip a full-screen loading shell when Home already loaded the same data. */
const TTL_MS = 120_000

type CachedBootstrap = {
  saved: SavedState
  subscription: SubscriptionRow | null
  at: number
}

const cacheByUser = new Map<string, CachedBootstrap>()

export function readBootstrapCache(userId: string): CachedBootstrap | null {
  const c = cacheByUser.get(userId)
  if (!c) return null
  if (Date.now() - c.at > TTL_MS) {
    cacheByUser.delete(userId)
    return null
  }
  return c
}

export function writeBootstrapCache(
  userId: string,
  saved: SavedState,
  subscription: SubscriptionRow | null
): void {
  cacheByUser.set(userId, { saved, subscription, at: Date.now() })
}

export function invalidateBootstrapCache(userId?: string): void {
  if (userId) cacheByUser.delete(userId)
  else cacheByUser.clear()
}
