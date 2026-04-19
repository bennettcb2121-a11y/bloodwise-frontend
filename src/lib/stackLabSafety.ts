import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { resolveBiomarkerForStackItem } from "@/src/lib/stackAffiliate"
import { resolveMarkerKey, shouldSkipSupplementForHighMarker } from "@/src/lib/supplements"

/**
 * Hide saved stack rows that contradict current labs (e.g. B12 supplement when B12 is high).
 * Saved snapshots may be stale after retaking the survey or range updates.
 */
const PROFILE_STACK_REASON = "From what you take today."

export function shouldOmitStackItemForLabs(
  item: SavedSupplementStackItem,
  analysis: Array<{ name: string; status: string }>
): boolean {
  /** User-declared stack — still show for logging even when labs say “high” (e.g. Vitamin D). */
  if (item.reason?.includes(PROFILE_STACK_REASON)) return false
  const bio = resolveBiomarkerForStackItem(item)
  if (!bio) return false
  const matchedKey = resolveMarkerKey(bio)
  if (!matchedKey) return false
  const row = analysis.find((a) => resolveMarkerKey(a.name) === matchedKey)
  if (!row) return false
  const st = (row.status || "").toLowerCase()
  if (shouldSkipSupplementForHighMarker(matchedKey, row.status)) return true
  if (matchedKey === "Ferritin" && st === "high") return true
  if (matchedKey === "Testosterone" && st === "high") return true
  return false
}

export function filterStackItemsByLabSafety(
  stack: SavedSupplementStackItem[],
  analysis: Array<{ name: string; status: string }>
): SavedSupplementStackItem[] {
  return stack.filter((item) => !shouldOmitStackItemForLabs(item, analysis))
}

/** Labs in range — supplement is optional / maintenance; show subtle review cue. */
export function shouldShowOptionalLabReviewOnStackItem(
  item: SavedSupplementStackItem,
  analysis: Array<{ name: string; status: string }>
): boolean {
  if (item.stackHint === "maintenance") return false
  const bio = resolveBiomarkerForStackItem(item)
  if (!bio) return false
  const matchedKey = resolveMarkerKey(bio)
  if (!matchedKey) return false
  const row = analysis.find((a) => resolveMarkerKey(a.name) === matchedKey)
  if (!row) return false
  return (row.status || "").toLowerCase() === "optimal"
}

export type StackItemBadgeKind = "maintenance" | "optional_lab" | "user_product_review"

/** Which badge to show on stack rows (maintenance Ferritin vs optional lab review). */
export function getStackItemBadgeKind(
  item: SavedSupplementStackItem,
  analysis: Array<{ name: string; status: string }>
): StackItemBadgeKind | null {
  if (item.stackHint === "maintenance") return "maintenance"
  if (item.fitStatus === "suboptimal" && item.userChoseKeepProduct) return "user_product_review"
  if (shouldShowOptionalLabReviewOnStackItem(item, analysis)) return "optional_lab"
  return null
}
