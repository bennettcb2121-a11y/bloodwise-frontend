/**
 * Range slider helper for Biomarkers dashboard: compute bar min, max, and dot position (0-100%).
 * Uses biomarkerDatabase ranges when available; fallback from optimalMin/optimalMax and status.
 */

import { biomarkerDatabase } from "./biomarkerDatabase"

export type RangeSliderResult = {
  barMin: number
  barMax: number
  dotPositionPercent: number
}

function normalizeMarkerKey(name: string): string {
  const n = name.trim()
  if (n === "25-OH Vitamin D") return "Vitamin D"
  if (n === "Fasting Glucose") return "Glucose"
  return n
}

/**
 * Compute range bar bounds and dot position for a biomarker value.
 * Uses biomarkerDatabase.ranges.general (deficient, suboptimalMin, optimalMin, optimalMax, high).
 * Dot position is 0-100 (left to right); values outside bar are clamped.
 */
export function getRangeSliderPosition(
  markerName: string,
  value: number,
  fallbackOptimalMin?: number | null,
  fallbackOptimalMax?: number | null
): RangeSliderResult {
  const key = normalizeMarkerKey(markerName)
  const entry = biomarkerDatabase[key]
  const range = entry?.ranges?.general

  let barMin: number
  let barMax: number

  if (range) {
    barMin =
      range.deficient ??
      range.suboptimalMin ??
      (range.optimalMin - (range.optimalMax - range.optimalMin) * 0.5)
    barMax =
      range.high ??
      range.optimalMax + (range.optimalMax - range.optimalMin) * 0.2
  } else if (
    fallbackOptimalMin != null &&
    fallbackOptimalMax != null
  ) {
    const span = fallbackOptimalMax - fallbackOptimalMin
    barMin = fallbackOptimalMin - span * 0.5
    barMax = fallbackOptimalMax + span * 0.2
  } else {
    barMin = value * 0.5
    barMax = value * 1.5
  }

  const span = barMax - barMin
  const rawPercent = span > 0 ? ((value - barMin) / span) * 100 : 50
  const dotPositionPercent = Math.max(0, Math.min(100, rawPercent))

  return { barMin, barMax, dotPositionPercent }
}
