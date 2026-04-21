import type { BloodworkSaveRow, BloodworkStackSnapshot, ProfileRow, SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { updateLatestBloodworkStackSnapshot, upsertProfile } from "@/src/lib/bloodwiseDb"
import {
  parseCurrentSupplementsEntries,
  serializeCurrentSupplementsEntries,
  type CurrentSupplementEntry,
} from "@/src/lib/supplementMetadata"
import { isProfileSourcedStackRow } from "@/src/lib/profileStackMerge"

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

function entriesMatchProfileRow(e: CurrentSupplementEntry, row: SavedSupplementStackItem): boolean {
  if (row.stackEntryId && e.clientId && row.stackEntryId === e.clientId) return true
  return norm(e.name) === norm(row.supplementName)
}

function stackRowMatches(a: SavedSupplementStackItem, b: SavedSupplementStackItem): boolean {
  if (norm(a.supplementName) !== norm(b.supplementName)) return false
  if ((a.marker ?? "") !== (b.marker ?? "")) return false
  if (a.stackEntryId || b.stackEntryId) return a.stackEntryId === b.stackEntryId
  return true
}

/**
 * Remove one stack row from profile JSON AND the latest bloodwork snapshot.
 *
 * We clear from both because the dashboard home page syncs the merged
 * (lab + profile) stack back into `bloodwork.stack_snapshot`, so a profile-sourced
 * row can also be cached in the snapshot. Deleting from profile alone let the
 * snapshot copy re-appear as a "lab" row, which matched the user-reported
 * "successfully deleted but it doesn't work" bug for duplicate rows.
 */
export async function deleteMergedStackItem(
  userId: string,
  row: SavedSupplementStackItem,
  profile: ProfileRow | null,
  bloodwork: BloodworkSaveRow | null
): Promise<void> {
  if (profile) {
    const entries = parseCurrentSupplementsEntries(profile.current_supplements ?? "")
    const next = entries.filter((e) => !entriesMatchProfileRow(e, row))
    if (next.length !== entries.length) {
      await upsertProfile(userId, { ...profile, current_supplements: serializeCurrentSupplementsEntries(next) })
    }
  }
  if (bloodwork?.stack_snapshot && "stack" in bloodwork.stack_snapshot) {
    const stack = (bloodwork.stack_snapshot as BloodworkStackSnapshot).stack
    const filtered = stack.filter((s) => !stackRowMatches(s, row))
    if (filtered.length !== stack.length) {
      await updateLatestBloodworkStackSnapshot(
        userId,
        { ...(bloodwork.stack_snapshot as BloodworkStackSnapshot), stack: filtered },
        undefined
      )
    }
  }
}

export type StackItemUpdatePayload = {
  supplementName: string
  dose: string
  productUrl?: string
  marker?: string
}

/** Update dose/name/url on profile entry or lab snapshot row. */
export async function updateMergedStackItem(
  userId: string,
  row: SavedSupplementStackItem,
  patch: StackItemUpdatePayload,
  profile: ProfileRow | null,
  bloodwork: BloodworkSaveRow | null
): Promise<void> {
  const name = patch.supplementName.trim()
  const productUrl = patch.productUrl !== undefined ? patch.productUrl.trim() : undefined

  if (isProfileSourcedStackRow(row) && profile) {
    const entries = parseCurrentSupplementsEntries(profile.current_supplements ?? "")
    const next = entries.map((e) => {
      if (!entriesMatchProfileRow(e, row)) return e
      return {
        ...e,
        name,
        ...(e.clientId ? { clientId: e.clientId } : {}),
        ...(patch.dose !== undefined ? { dose: patch.dose } : {}),
        ...(productUrl !== undefined ? { productUrl: productUrl || undefined } : {}),
      }
    })
    if (JSON.stringify(next) !== JSON.stringify(entries)) {
      await upsertProfile(userId, { ...profile, current_supplements: serializeCurrentSupplementsEntries(next) })
    }
    // Fall through so a cached snapshot copy of this profile row gets updated too.
  }

  if (!bloodwork?.stack_snapshot || !("stack" in bloodwork.stack_snapshot)) return
  const snap = bloodwork.stack_snapshot as BloodworkStackSnapshot
  const stack = [...snap.stack]
  const idx = stack.findIndex((s) => stackRowMatches(s, row))
  if (idx < 0) return
  const prev = stack[idx]
  stack[idx] = {
    ...prev,
    supplementName: name,
    dose: patch.dose !== undefined ? patch.dose : prev.dose,
    ...(patch.marker?.trim() ? { marker: patch.marker.trim() } : {}),
    ...(productUrl !== undefined ? { productUrl: productUrl || undefined } : {}),
  }
  await updateLatestBloodworkStackSnapshot(userId, { ...snap, stack }, undefined)
}
