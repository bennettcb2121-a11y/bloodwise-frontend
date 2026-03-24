/**
 * Trend insights: first→last, delta, target progress, and optional "weeks to target" heuristic.
 */

export type TrendPoint = { date: string; ferritin: number; vitaminD: number; magnesium: number; b12: number }

export type TrendInsightItem = {
  key: "ferritin" | "vitaminD" | "magnesium" | "b12"
  label: string
  first: number
  last: number
  delta: number
  targetMin: number | null
  targetMax: number | null
  /** Heuristic: at linear rate, weeks until last could reach target (only if 2+ points and below target). */
  weeksToTarget: number | null
}

const TREND_KEYS: Array<{ key: TrendInsightItem["key"]; label: string }> = [
  { key: "ferritin", label: "Ferritin" },
  { key: "vitaminD", label: "Vitamin D" },
  { key: "magnesium", label: "Magnesium" },
  { key: "b12", label: "B12" },
]

/** Map trend key to analysis result name for target lookup. */
const KEY_TO_ANALYSIS_NAME: Record<TrendInsightItem["key"], string> = {
  ferritin: "Ferritin",
  vitaminD: "Vitamin D",
  magnesium: "Magnesium",
  b12: "Vitamin B12",
}

type AnalysisResult = { name?: string; value?: number; optimalMin?: number | null; optimalMax?: number | null }

export function getTrendInsights(
  trendData: TrendPoint[],
  analysisResults: AnalysisResult[] = []
): TrendInsightItem[] {
  if (!trendData.length) return []

  const first = trendData[0]
  const last = trendData[trendData.length - 1]

  function getTarget(key: TrendInsightItem["key"]) {
    const name = KEY_TO_ANALYSIS_NAME[key]
    const r = analysisResults.find(
      (a) =>
        (a.name ?? "").toLowerCase() === name.toLowerCase() ||
        (key === "vitaminD" && (a.name ?? "").toLowerCase().includes("vitamin d"))
    )
    return {
      min: r?.optimalMin ?? null,
      max: r?.optimalMax ?? null,
    }
  }

  return TREND_KEYS.map(({ key, label }) => {
    const firstVal = first[key] ?? 0
    const lastVal = last[key] ?? 0
    const delta = lastVal - firstVal
    const { min: targetMin, max: targetMax } = getTarget(key)

    let weeksToTarget: number | null = null
    if (
      trendData.length >= 2 &&
      targetMin != null &&
      lastVal < targetMin &&
      delta > 0
    ) {
      const remaining = targetMin - lastVal
      const weeksBetweenFirstLast =
        trendData.length > 1 ? (trendData.length - 1) * 6 : 6
      const ratePerWeek = delta / Math.max(weeksBetweenFirstLast, 1)
      if (ratePerWeek > 0) {
        weeksToTarget = Math.ceil(remaining / ratePerWeek)
        weeksToTarget = Math.max(4, Math.min(weeksToTarget, 24))
      }
    }

    return {
      key,
      label,
      first: firstVal,
      last: lastVal,
      delta,
      targetMin,
      targetMax,
      weeksToTarget,
    }
  })
}
