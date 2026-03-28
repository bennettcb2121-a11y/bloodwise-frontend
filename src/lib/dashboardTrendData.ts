import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"

export type TrendPoint = { date: string; ferritin: number; vitaminD: number; magnesium: number; b12: number }

export function pickNumber(inputs: Record<string, string | number>, ...names: (string | string[])[]): number | undefined {
  const flat = names.flat().map((n) => (typeof n === "string" ? [n] : n)).flat()
  for (const key of Object.keys(inputs)) {
    const lower = key.toLowerCase()
    if (flat.some((n) => lower.includes(String(n).toLowerCase()))) {
      const v = inputs[key]
      if (v !== undefined && v !== "") return Number(v)
    }
  }
  return undefined
}

/** Build trend data from real bloodwork history only (≥2 saves). No synthetic/demo series. */
export function getTrendData(history: BloodworkSaveRow[]): TrendPoint[] {
  if (history.length < 2) return []
  return history
    .slice()
    .reverse()
    .map((row) => {
      const in_ = row.biomarker_inputs ?? {}
      const ferritin = pickNumber(in_, "ferritin") ?? 0
      const vitaminD = pickNumber(in_, "vitamin d", "vitamin_d", "vitd") ?? 0
      const magnesium = pickNumber(in_, "magnesium", "mg") ?? 0
      const b12 = pickNumber(in_, "b12", "cobalamin", "vitamin b12") ?? 0
      const date = row.created_at
        ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        : ""
      return { date, ferritin, vitaminD, magnesium, b12 }
    })
}

export type PriorityTrendKey = "ferritin" | "vitaminD" | "magnesium" | "b12"

/** Map a driver marker name to the numeric series in `getTrendData` (subset of markers only). */
export function markerNameToTrendKey(markerName: string): PriorityTrendKey | null {
  const m = markerName.trim().toLowerCase()
  if (m.includes("ferritin")) return "ferritin"
  if (m.includes("vitamin d") || m.includes("25-oh")) return "vitaminD"
  if (m.includes("magnesium")) return "magnesium"
  if (m.includes("b12") || m.includes("cobalamin")) return "b12"
  return null
}

/**
 * Oldest→newest values for the priority marker when history has ≥2 panels and the marker maps to a trend key.
 * Returns null if there is no usable variation (flat or all zeros).
 */
export function getPriorityMarkerSeries(
  history: BloodworkSaveRow[],
  markerName: string
): { displayName: string; values: number[]; dates: string[] } | null {
  const key = markerNameToTrendKey(markerName)
  if (!key || history.length < 2) return null
  const points = getTrendData(history)
  if (points.length < 2) return null
  const values = points.map((p) => p[key])
  if (values.every((v) => v === 0)) return null
  const displayName = markerName.trim()
  return {
    displayName,
    values,
    dates: points.map((p) => p.date),
  }
}
