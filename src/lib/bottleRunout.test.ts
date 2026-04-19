import { describe, it, expect } from "vitest"
import { computeRunningLow, normalizeSupplementKey, RUNNING_LOW_MAX_ITEMS } from "./bottleRunout"
import {
  getDaysUntilRunOut,
  getRunOutDate,
  type SavedSupplementStackItem,
  type SupplementInventoryRow,
} from "./bloodwiseDb"

const DAY_MS = 24 * 60 * 60 * 1000

function makeStackItem(name: string, extra: Partial<SavedSupplementStackItem> = {}): SavedSupplementStackItem {
  return {
    supplementName: name,
    dose: "1 daily",
    monthlyCost: 12,
    recommendationType: "Core",
    reason: "test",
    ...extra,
  }
}

/**
 * Build an inventory row that — once run through getRunOutDate/getDaysUntilRunOut —
 * yields exactly `targetDaysLeft`. The date helpers mix UTC and local TZ (see
 * bloodwiseDb.ts), so calibrate opened_at empirically in local time to stay
 * timezone-stable in CI.
 */
function makeInventoryWithDaysLeft(
  supplementName: string,
  targetDaysLeft: number,
  options: { pills?: number; dose?: number } = {}
): SupplementInventoryRow {
  const pills = options.pills ?? 60
  const dose = options.dose ?? 1
  const supply = Math.floor(pills / dose)
  const baseLocal = new Date()
  baseLocal.setHours(0, 0, 0, 0)

  for (let delta = -3; delta <= 3; delta++) {
    const candidate = new Date(baseLocal.getTime() + (targetDaysLeft - supply + delta) * DAY_MS)
    const y = candidate.getFullYear()
    const m = String(candidate.getMonth() + 1).padStart(2, "0")
    const d = String(candidate.getDate()).padStart(2, "0")
    const iso = `${y}-${m}-${d}`
    const runOut = getRunOutDate(iso, pills, dose)
    if (getDaysUntilRunOut(runOut) === targetDaysLeft) {
      return {
        user_id: "user-1",
        supplement_name: supplementName,
        pills_per_bottle: pills,
        dose_per_day: dose,
        opened_at: iso,
      }
    }
  }
  throw new Error(`Unable to calibrate inventory for daysLeft=${targetDaysLeft}`)
}

describe("normalizeSupplementKey", () => {
  it("trims and lowercases", () => {
    expect(normalizeSupplementKey("  Magnesium Glycinate  ")).toBe("magnesium glycinate")
  })
  it("handles empty / nullish input", () => {
    expect(normalizeSupplementKey("")).toBe("")
    expect(normalizeSupplementKey(undefined as unknown as string)).toBe("")
  })
})

describe("computeRunningLow", () => {
  it("returns a stack item with 3 days left when notifyDays is 7, sorted urgent-first", () => {
    const stack = [makeStackItem("Magnesium"), makeStackItem("Omega-3")]
    const inventory = [
      makeInventoryWithDaysLeft("Magnesium", 3),
      makeInventoryWithDaysLeft("Omega-3", 6),
    ]
    const result = computeRunningLow(stack, inventory, 7)
    expect(result).toHaveLength(2)
    expect(result[0].supplementName).toBe("Magnesium")
    expect(result[0].daysLeft).toBe(3)
    expect(result[0].reorderUrl).toMatch(/^https?:\/\//)
    expect(result[1].supplementName).toBe("Omega-3")
    expect(result[1].daysLeft).toBe(6)
  })

  it("filters out items with daysLeft > notifyDays", () => {
    const stack = [makeStackItem("Vitamin D")]
    const inventory = [makeInventoryWithDaysLeft("Vitamin D", 20)]
    const result = computeRunningLow(stack, inventory, 7)
    expect(result).toHaveLength(0)
  })

  it("skips stack items with no matching inventory row", () => {
    const stack = [makeStackItem("Zinc"), makeStackItem("Copper")]
    const inventory = [makeInventoryWithDaysLeft("Zinc", 2)]
    const result = computeRunningLow(stack, inventory, 7)
    expect(result).toHaveLength(1)
    expect(result[0].supplementName).toBe("Zinc")
  })

  it("matches stack and inventory across trimmed / case-insensitive names", () => {
    const stack = [makeStackItem("  MAGNESIUM Glycinate  ")]
    const inventory = [makeInventoryWithDaysLeft("magnesium glycinate", 1)]
    const result = computeRunningLow(stack, inventory, 7)
    expect(result).toHaveLength(1)
    expect(result[0].daysLeft).toBe(1)
  })

  it("filters out items whose snooze has not yet expired", () => {
    const stack = [makeStackItem("Magnesium")]
    const inventory = [makeInventoryWithDaysLeft("Magnesium", 2)]
    const now = Date.now()
    const snoozeMap = { magnesium: now + 2 * DAY_MS }
    const result = computeRunningLow(stack, inventory, 7, snoozeMap, now)
    expect(result).toHaveLength(0)
  })

  it("includes items whose snooze has expired", () => {
    const stack = [makeStackItem("Magnesium")]
    const inventory = [makeInventoryWithDaysLeft("Magnesium", 2)]
    const now = Date.now()
    const snoozeMap = { magnesium: now - 1000 }
    const result = computeRunningLow(stack, inventory, 7, snoozeMap, now)
    expect(result).toHaveLength(1)
  })

  it("caps output at RUNNING_LOW_MAX_ITEMS and keeps the most urgent", () => {
    const names = ["A", "B", "C", "D", "E", "F", "G"]
    const stack = names.map((n) => makeStackItem(n))
    const inventory = names.map((n, i) => makeInventoryWithDaysLeft(n, i))
    const result = computeRunningLow(stack, inventory, 30)
    expect(result).toHaveLength(RUNNING_LOW_MAX_ITEMS)
    expect(result[0].supplementName).toBe("A")
    expect(result[0].daysLeft).toBe(0)
    expect(result.map((r) => r.daysLeft)).toEqual([0, 1, 2, 3, 4])
  })

  it("leaves estimatedMonthlySavings as null (no fabricated pricing yet)", () => {
    const stack = [makeStackItem("Magnesium", { monthlyCost: 24 })]
    const inventory = [makeInventoryWithDaysLeft("Magnesium", 3)]
    const result = computeRunningLow(stack, inventory, 7)
    expect(result[0].estimatedMonthlySavings).toBeNull()
  })

  it("returns empty when stack or inventory is empty", () => {
    expect(computeRunningLow([], [makeInventoryWithDaysLeft("X", 1)], 7)).toEqual([])
    expect(computeRunningLow([makeStackItem("X")], [], 7)).toEqual([])
  })
})
