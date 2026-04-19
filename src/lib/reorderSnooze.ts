import { normalizeSupplementKey } from "@/src/lib/bottleRunout"

const STORAGE_KEY = "clarion_reorder_snooze_v1"

function readMap(): Record<string, number> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const key = normalizeSupplementKey(k)
      const ts = Number(v)
      if (key && Number.isFinite(ts) && ts > 0) out[key] = ts
    }
    return out
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, number>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota errors */
  }
}

/** Return the snoozed-until timestamp (ms epoch) for a supplement, or null if none. */
export function getSnoozedUntil(supplementName: string): number | null {
  const key = normalizeSupplementKey(supplementName)
  if (!key) return null
  const map = readMap()
  const ts = map[key]
  return typeof ts === "number" && ts > 0 ? ts : null
}

/** Persist a snooze for `days` from now. No-op during SSR. */
export function snoozeReorder(supplementName: string, days: number): void {
  const key = normalizeSupplementKey(supplementName)
  if (!key) return
  const safeDays = Number.isFinite(days) && days > 0 ? days : 3
  const until = Date.now() + safeDays * 24 * 60 * 60 * 1000
  const map = readMap()
  map[key] = until
  writeMap(map)
}

/** Remove any active snooze for a supplement. */
export function clearSnooze(supplementName: string): void {
  const key = normalizeSupplementKey(supplementName)
  if (!key) return
  const map = readMap()
  if (!(key in map)) return
  delete map[key]
  writeMap(map)
}

/**
 * Load the full snooze map, pruned of expired entries. Useful for building the
 * Record<string, number> that `computeRunningLow` expects.
 */
export function loadReorderSnoozeMap(now: number = Date.now()): Record<string, number> {
  const map = readMap()
  let mutated = false
  for (const [key, ts] of Object.entries(map)) {
    if (ts <= now) {
      delete map[key]
      mutated = true
    }
  }
  if (mutated) writeMap(map)
  return map
}
