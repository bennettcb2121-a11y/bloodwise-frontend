/**
 * Score-related helpers: health score label and status counts from analysis.
 */

export type StatusCounts = {
  optimal: number
  borderline: number
  flagged: number
  unknown: number
}

export function scoreToLabel(score: number): string {
  if (score >= 90) return "Optimized"
  if (score >= 75) return "Strong"
  if (score >= 60) return "Mixed"
  return "Needs attention"
}

export function countByStatus(
  analysis: Array<{ status?: string }>
): StatusCounts {
  return analysis.reduce(
    (acc, item) => {
      const s = (item.status || "").toLowerCase()
      if (s === "optimal" || s === "normal" || s === "in range") acc.optimal += 1
      else if (s === "suboptimal") acc.borderline += 1
      else if (s === "deficient" || s === "high") acc.flagged += 1
      else acc.unknown += 1
      return acc
    },
    { optimal: 0, borderline: 0, flagged: 0, unknown: 0 }
  )
}
