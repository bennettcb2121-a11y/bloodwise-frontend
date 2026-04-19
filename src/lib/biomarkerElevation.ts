import type { UserProfile } from "./classifyUser"
import { getAdaptiveRangeForMarker } from "./analyzeBiomarkers"
import { resolveActionPlanDbKey } from "./biomarkerAliases"

export type ElevationTier = "mild" | "moderate" | "severe"

/**
 * For values above Clarion’s optimal band, classify how far above the lab’s “concern” threshold (when defined in ranges.high).
 * Educational only — not a diagnosis (NIH ODS / Merck-style framing: toxicity and thresholds are context-dependent).
 */
export function elevationTierForHighValue(
  biomarkerKey: string,
  value: number,
  profile: UserProfile
): ElevationTier {
  const dbKey = resolveActionPlanDbKey(biomarkerKey.trim())
  const range = getAdaptiveRangeForMarker(dbKey, profile)
  if (!range || value <= range.optimalMax) return "mild"

  const highLine = typeof range.high === "number" ? range.high : null
  if (highLine == null) {
    const span = Math.max(range.optimalMax - (range.optimalMin ?? range.optimalMax * 0.5), 1)
    const excess = value - range.optimalMax
    if (excess > span * 2) return "severe"
    if (excess > span) return "moderate"
    return "mild"
  }

  if (value >= highLine * 1.2) return "severe"
  if (value >= highLine) return "moderate"
  return "mild"
}
