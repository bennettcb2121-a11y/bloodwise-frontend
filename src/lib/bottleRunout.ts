import {
  getDaysUntilRunOut,
  getRunOutDate,
  type SavedSupplementStackItem,
  type SupplementInventoryRow,
} from "@/src/lib/bloodwiseDb"
import { getStackItemReorderContext } from "@/src/lib/stackItemReorder"

/** Max number of running-low rows we surface on the dashboard card. */
export const RUNNING_LOW_MAX_ITEMS = 5

export type RunningLowItem = {
  supplementName: string
  daysLeft: number
  runOutDate: string
  stackItem: SavedSupplementStackItem
  reorderUrl: string
  reorderLabel: string
  /** Dollar estimate if we can compute a delta vs. user's saved productUrl (or null) */
  estimatedMonthlySavings: number | null
}

/** Normalize a supplement name for cross-source matching (inventory vs. stack vs. snooze key). */
export function normalizeSupplementKey(name: string): string {
  return (name ?? "").trim().toLowerCase()
}

/**
 * Compute which stack items are running low and should be surfaced for reorder.
 *
 * Rules:
 *  - Match stack items to inventory by normalized supplement_name.
 *  - Skip stack items without an inventory row (user hasn't configured bottle state).
 *  - Include only items where daysLeft <= notifyDays.
 *  - Drop items whose snoozedUntil (ms epoch) is still in the future.
 *  - Sort ascending by daysLeft (most urgent first), capped at RUNNING_LOW_MAX_ITEMS.
 *  - estimatedMonthlySavings stays null until a real pricing source exists — never fabricate.
 */
export function computeRunningLow(
  stack: SavedSupplementStackItem[],
  inventory: SupplementInventoryRow[],
  notifyDays: number,
  snoozeMap: Record<string, number> = {},
  now: number = Date.now()
): RunningLowItem[] {
  if (!Array.isArray(stack) || stack.length === 0) return []
  if (!Array.isArray(inventory) || inventory.length === 0) return []

  const threshold = Number.isFinite(notifyDays) && notifyDays > 0 ? Math.floor(notifyDays) : 7

  const inventoryByKey = new Map<string, SupplementInventoryRow>()
  for (const row of inventory) {
    const key = normalizeSupplementKey(row.supplement_name)
    if (!key) continue
    if (!inventoryByKey.has(key)) inventoryByKey.set(key, row)
  }

  const rows: RunningLowItem[] = []
  const seen = new Set<string>()

  for (const item of stack) {
    const name = item?.supplementName?.trim()
    if (!name) continue
    const key = normalizeSupplementKey(name)
    if (seen.has(key)) continue

    const inv = inventoryByKey.get(key)
    if (!inv) continue

    const pills = Number(inv.pills_per_bottle)
    const dose = Number(inv.dose_per_day)
    if (!Number.isFinite(pills) || pills <= 0) continue
    if (!Number.isFinite(dose) || dose <= 0) continue

    const runOutDate = getRunOutDate(inv.opened_at, pills, dose)
    const daysLeft = getDaysUntilRunOut(runOutDate)
    if (daysLeft > threshold) continue

    const snoozedUntil = snoozeMap[key]
    if (typeof snoozedUntil === "number" && snoozedUntil > now) continue

    const ctx = getStackItemReorderContext(item)

    rows.push({
      supplementName: name,
      daysLeft,
      runOutDate,
      stackItem: item,
      reorderUrl: ctx.primaryUrl,
      reorderLabel: ctx.primaryLabel,
      estimatedMonthlySavings: null,
    })
    seen.add(key)
  }

  rows.sort((a, b) => {
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft
    return a.supplementName.localeCompare(b.supplementName)
  })

  return rows.slice(0, RUNNING_LOW_MAX_ITEMS)
}
