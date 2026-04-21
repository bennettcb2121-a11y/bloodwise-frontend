import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { resolveBiomarkerForStackItem } from "@/src/lib/stackAffiliate"
import { resolveMarkerKey } from "@/src/lib/supplements"

const STORAGE_ACQ = "clarion_stack_acq_v1_"
const STORAGE_PROMO = "clarion_stack_promo_dismiss_v1_"

/**
 * none = not ordered yet (gray / pending)
 * ordered = placed order
 * shipped = on the way
 * have = in hand
 */
export type AcquisitionMode = "none" | "have" | "ordered" | "shipped"

export function acquisitionModeIsInStack(mode: AcquisitionMode | undefined): boolean {
  return mode === "have" || mode === "ordered" || mode === "shipped"
}

export type StackItemAcquisition = {
  mode: AcquisitionMode
}

export type StackAcquisitionMap = Record<string, StackItemAcquisition>

/**
 * Stable id for localStorage acquisition + Plan vs Today. Uses resolved biomarker key
 * (e.g. always `vitamin d::…`) so “I have it” on Home matches Plan after the same supplement.
 */
/** Oldest keys: raw marker string + product name. */
function legacyStackItemStorageKeyV0(item: SavedSupplementStackItem): string {
  const m = (item.marker ?? "").trim().toLowerCase()
  const n = (item.supplementName ?? "").trim().toLowerCase()
  if (m && n) return `${m}::${n}`
  return n || m || "unknown"
}

/** Intermediate keys: resolved marker + product name. */
function legacyStackItemStorageKeyV1(item: SavedSupplementStackItem): string {
  const bio = resolveBiomarkerForStackItem(item)
  const resolved = bio ? resolveMarkerKey(bio) : null
  const markerPart = (resolved ?? item.marker ?? "").trim().toLowerCase().replace(/\s+/g, " ")
  const n = (item.supplementName ?? "").trim().toLowerCase()
  if (markerPart && n) return `${markerPart}::${n}`
  return n || markerPart || "unknown"
}

/**
 * One key per biomarker when we can resolve it (e.g. `vitamin d`) so Home + Plan match
 * and “I have it” applies across label variants.
 */
export function stackItemStorageKey(item: SavedSupplementStackItem): string {
  const bio = resolveBiomarkerForStackItem(item)
  const resolved = bio ? resolveMarkerKey(bio) : null
  if (resolved) {
    return resolved.trim().toLowerCase().replace(/\s+/g, " ")
  }
  // Fallback to the inferred biomarker (e.g. "Vitamin C") so free-text + lab rows dedupe.
  if (bio) return bio.trim().toLowerCase().replace(/\s+/g, " ")
  const n = (item.supplementName ?? "").trim().toLowerCase()
  return n || "unknown"
}

const USER_PRODUCT_URL_RE = /^https?:\/\//i

/**
 * True when the user has already told Clarion what they use (saved link, profile intake id, or “keep my product”).
 * Used so Plan “active stack” / acquisition doesn’t ask for “I have it” again for the same supplement.
 */
export function itemImpliesUserAlreadyHasSupply(item: SavedSupplementStackItem): boolean {
  const u = item.productUrl?.trim()
  if (u && USER_PRODUCT_URL_RE.test(u)) return true
  if (item.userChoseKeepProduct) return true
  if (item.stackEntryId?.trim()) return true
  return false
}

/** Stored mode, or inferred “have” when {@link itemImpliesUserAlreadyHasSupply} and nothing stronger is stored. */
export function getEffectiveAcquisitionMode(
  item: SavedSupplementStackItem,
  key: string,
  map: StackAcquisitionMap
): AcquisitionMode {
  const stored = map[key]?.mode ?? "none"
  if (acquisitionModeIsInStack(stored)) return stored
  if (itemImpliesUserAlreadyHasSupply(item)) return "have"
  return stored
}

/** Persist default “have” for items with saved product / profile intake so localStorage matches inferred UI. */
export function mergeInferredAcquisitionDefaults(
  stack: SavedSupplementStackItem[],
  map: StackAcquisitionMap
): { map: StackAcquisitionMap; changed: boolean } {
  const next = { ...map }
  let changed = false
  for (const item of stack) {
    if (!itemImpliesUserAlreadyHasSupply(item)) continue
    const key = stackItemStorageKey(item)
    const mode = next[key]?.mode
    if (!acquisitionModeIsInStack(mode)) {
      next[key] = { mode: "have" }
      changed = true
    }
  }
  return { map: next, changed }
}

/**
 * Copy acquisition entries from legacy keys onto canonical keys (same supplement row).
 */
export function migrateStackAcquisitionMap(
  map: StackAcquisitionMap,
  stack: SavedSupplementStackItem[]
): { map: StackAcquisitionMap; changed: boolean } {
  const next = { ...map }
  let changed = false
  for (const row of stack) {
    const newK = stackItemStorageKey(row)
    for (const oldK of [legacyStackItemStorageKeyV0(row), legacyStackItemStorageKeyV1(row)]) {
      if (oldK === newK) continue
      if (next[newK] != null) continue
      const legacy = next[oldK]
      if (legacy) {
        next[newK] = legacy
        changed = true
        break
      }
    }
  }
  return { map: changed ? next : map, changed }
}

export function loadStackAcquisition(userId: string): StackAcquisitionMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_ACQ + userId)
    if (!raw) return {}
    const p = JSON.parse(raw) as StackAcquisitionMap
    return p && typeof p === "object" ? p : {}
  } catch {
    return {}
  }
}

export function saveStackAcquisition(userId: string, map: StackAcquisitionMap): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_ACQ + userId, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function setStackItemAcquisition(
  userId: string,
  key: string,
  acquisition: StackItemAcquisition
): StackAcquisitionMap {
  const next = { ...loadStackAcquisition(userId), [key]: acquisition }
  saveStackAcquisition(userId, next)
  return next
}

export function markAllAsHave(userId: string, keys: string[]): StackAcquisitionMap {
  const next = { ...loadStackAcquisition(userId) }
  for (const k of keys) {
    next[k] = { mode: "have" }
  }
  saveStackAcquisition(userId, next)
  return next
}

export function loadDismissedOrderPromoKeys(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_PROMO + userId)
    if (!raw) return new Set()
    const a = JSON.parse(raw) as unknown
    if (!Array.isArray(a)) return new Set()
    return new Set(a.filter((x): x is string => typeof x === "string"))
  } catch {
    return new Set()
  }
}

export function dismissOrderPromoKey(userId: string, key: string): void {
  if (typeof window === "undefined") return
  try {
    const s = loadDismissedOrderPromoKeys(userId)
    s.add(key)
    localStorage.setItem(STORAGE_PROMO + userId, JSON.stringify([...s]))
  } catch {
    // ignore
  }
}

export function getAcquisitionForKey(map: StackAcquisitionMap, key: string): StackItemAcquisition | undefined {
  return map[key]
}
