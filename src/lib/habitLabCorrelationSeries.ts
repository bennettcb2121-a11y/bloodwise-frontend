import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { pickNumber } from "@/src/lib/dashboardTrendData"

export type HabitLabRow = {
  /** Short label for chart X */
  label: string
  /** ISO date yyyy-mm-dd for sorting/tooltip */
  isoDate: string
  /** % of stack items checked that day, or null if no stack / no row */
  adherence: number | null
  /** Self-reported 1–5 from daily check-in */
  activityLevel: number | null
  /** Same as activity, mapped to 0–100 for one axis with adherence */
  activityScaled: number | null
  /** Vitamin D numeric value on lab upload days only */
  vitaminDLab: number | null
  /** Ferritin on lab days only */
  ferritinLab: number | null
}

function isoFromCreatedAt(createdAt: string | undefined | null): string | null {
  if (!createdAt) return null
  try {
    return new Date(createdAt).toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/**
 * Merge protocol logs (habits) with sparse lab values on panel dates so users can see
 * whether supplementation / adherence lines up with retests.
 */
export function buildHabitLabCorrelationSeries(
  protocolRows: { log_date: string; checks: Record<string, boolean>; metrics: DailyMetrics }[],
  stackItemNames: string[],
  labHistory: BloodworkSaveRow[]
): HabitLabRow[] {
  const stack = stackItemNames.map((s) => s.trim()).filter(Boolean)
  const protocolByDate = new Map(protocolRows.map((r) => [r.log_date, r]))

  const labByDate = new Map<string, { vd?: number; fe?: number }>()
  for (const row of labHistory) {
    const d = isoFromCreatedAt(row.created_at)
    if (!d) continue
    const inputs = row.biomarker_inputs ?? {}
    const vd = pickNumber(inputs as Record<string, string | number>, "vitamin d", "vitamin_d", "vitd")
    const fe = pickNumber(inputs as Record<string, string | number>, "ferritin")
    labByDate.set(d, { vd, fe })
  }

  const dates = new Set<string>()
  protocolByDate.forEach((_, d) => dates.add(d))
  labByDate.forEach((_, d) => dates.add(d))
  if (dates.size === 0) return []

  const sorted = [...dates].sort()

  return sorted.map((isoDate) => {
    const pr = protocolByDate.get(isoDate)
    const lab = labByDate.get(isoDate)
    let adherence: number | null = null
    if (pr && stack.length > 0) {
      const done = stack.filter((name) => pr.checks[name]).length
      adherence = Math.round((done / stack.length) * 100)
    }
    const m = pr?.metrics
    const al = typeof m?.activity_level === "number" ? m.activity_level : null
    const activityScaled =
      al != null && al >= 1 && al <= 5 ? Math.round(((al - 1) / 4) * 100) : null
    const d = new Date(isoDate + "T12:00:00")
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return {
      label,
      isoDate,
      adherence,
      activityLevel: al,
      activityScaled,
      vitaminDLab: lab?.vd != null && Number.isFinite(lab.vd) ? lab.vd : null,
      ferritinLab: lab?.fe != null && Number.isFinite(lab.fe) ? lab.fe : null,
    }
  })
}

export function extractStackNamesFromSnapshot(
  snapshot: BloodworkSaveRow["stack_snapshot"] | null | undefined
): string[] {
  if (snapshot && typeof snapshot === "object" && "stack" in snapshot && Array.isArray((snapshot as { stack?: unknown }).stack)) {
    return ((snapshot as { stack: { supplementName?: string }[] }).stack || [])
      .map((s) => s.supplementName || "")
      .filter(Boolean)
  }
  return []
}
