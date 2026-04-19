import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { resolveBiomarkerForStackItem } from "@/src/lib/stackAffiliate"
import { stackItemStorageKey } from "@/src/lib/stackAcquisition"
import { getSupplementPreset, isExplicitLifestylePresetLabel, parseCurrentSupplementsEntries } from "@/src/lib/supplementMetadata"

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

/** Preset display names that are never produced by lab recommendations — only profile or legacy bad merges. */
const LIFESTYLE_SNAPSHOT_BLOCKLIST = new Set(
  (["electrolytes", "protein_powder"] as const).map((id) => normalizeName(getSupplementPreset(id)!.displayName))
)

/**
 * Drops Electrolytes / Protein powder from persisted `stack_snapshot` rows.
 * Labs never recommend these names; they only re-enter the merged protocol via `stackItemsFromProfileCurrentSupplements`
 * when parsing passes strict lifestyle checks. Keeping them here when profile "matched" let stale preset JSON resurrect ghosts.
 */
export function filterOrphanLifestyleRowsFromLabSnapshot(labSnapshotRows: SavedSupplementStackItem[]): SavedSupplementStackItem[] {
  return labSnapshotRows.filter((row) => {
    const n = normalizeName(row.supplementName)
    return !LIFESTYLE_SNAPSHOT_BLOCKLIST.has(n)
  })
}

/**
 * Convert profile.current_supplements (JSON or comma text) into stack rows for the protocol.
 */
export function stackItemsFromProfileCurrentSupplements(raw: string | undefined | null): SavedSupplementStackItem[] {
  if (!raw?.trim()) return []
  const entries = parseCurrentSupplementsEntries(raw)
  const out: SavedSupplementStackItem[] = []
  for (const e of entries) {
    if (e.id === "electrolytes" && !isExplicitLifestylePresetLabel("electrolytes", e.name)) continue
    if (e.id === "protein_powder" && !isExplicitLifestylePresetLabel("protein_powder", e.name)) continue
    const name = e.name.trim()
    if (!name) continue
    const draft: SavedSupplementStackItem = {
      supplementName: name,
      dose: e.dose?.trim() ?? "",
      monthlyCost: 0,
      recommendationType: "Context-dependent",
      reason: "From what you take today.",
    }
    if (e.clientId) draft.stackEntryId = e.clientId
    if (e.productUrl?.trim()) draft.productUrl = e.productUrl.trim()
    if (e.fitStatus) draft.fitStatus = e.fitStatus
    if (e.userChoseKeepProduct) draft.userChoseKeepProduct = true
    const bio = resolveBiomarkerForStackItem(draft)
    if (bio) draft.marker = bio
    out.push(draft)
  }
  return out
}

/**
 * When lab recommendations and profile "what you take" resolve to the same canonical key (e.g. `magnesium`),
 * keep the lab row (copy, priorities) but attach the user's product link, dose, and intake metadata from profile.
 * Without this, lab rows win the dedupe and `productUrl` from profile was dropped — Plan/Home showed Clarion picks instead of saved links.
 */
function overlayProfileOntoLabRow(
  lab: SavedSupplementStackItem,
  profile: SavedSupplementStackItem
): SavedSupplementStackItem {
  const out: SavedSupplementStackItem = { ...lab }
  const pu = profile.productUrl?.trim()
  if (pu) out.productUrl = pu
  if (profile.stackEntryId) out.stackEntryId = profile.stackEntryId
  if (profile.fitStatus) out.fitStatus = profile.fitStatus
  if (profile.userChoseKeepProduct) out.userChoseKeepProduct = true
  const pd = profile.dose?.trim()
  if (pd) out.dose = pd
  return out
}

/**
 * Lab-based stack first; add profile-only supplements that are not already covered (same biomarker or same name).
 * When a profile row matches a lab row by `stackItemStorageKey`, profile fields (product URL, dose, fit) are merged onto the lab row.
 * Dedupes within the lab list too (saved snapshots can contain duplicate rows for the same biomarker).
 */
export function mergeLabStackWithProfileStack(
  labStack: SavedSupplementStackItem[],
  profileStack: SavedSupplementStackItem[]
): SavedSupplementStackItem[] {
  const profileByKey = new Map<string, SavedSupplementStackItem>()
  for (const row of profileStack) {
    profileByKey.set(stackItemStorageKey(row), row)
  }

  const seen = new Set<string>()
  const merged: SavedSupplementStackItem[] = []
  for (const row of labStack) {
    const k = stackItemStorageKey(row)
    if (seen.has(k)) continue
    seen.add(k)
    const prof = profileByKey.get(k)
    merged.push(prof ? overlayProfileOntoLabRow(row, prof) : row)
  }
  for (const row of profileStack) {
    const k = stackItemStorageKey(row)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(row)
  }
  return merged
}

/** Final pass: same canonical key → keep first row (defensive). */
export function dedupeStackByStorageKey(stack: SavedSupplementStackItem[]): SavedSupplementStackItem[] {
  const seen = new Set<string>()
  const out: SavedSupplementStackItem[] = []
  for (const row of stack) {
    const k = stackItemStorageKey(row)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(row)
  }
  return out
}

/** Rows created only from profile "what you take" (editable / deletable via profile JSON). */
export function isProfileSourcedStackRow(row: SavedSupplementStackItem): boolean {
  return row.recommendationType === "Context-dependent" && row.reason.includes("From what you take")
}

export function sortedSupplementNamesKey(items: SavedSupplementStackItem[]): string {
  return [...items]
    .map((i) => normalizeName(i.supplementName))
    .filter(Boolean)
    .sort()
    .join("|")
}
