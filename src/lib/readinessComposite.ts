import type { DailyMetrics } from "@/src/lib/dailyMetrics"

/** 0–100 per dimension (higher = better for daily score blend). */
export function normalizeSleepScore(h?: number): number {
  if (h == null || h <= 0) return 0
  const peak = 8
  const dist = Math.abs(h - peak)
  return Math.max(0, Math.min(100, 100 - dist * 14))
}

export function normalizeHydrationScore(cups?: number): number {
  if (cups == null || cups < 0) return 0
  return Math.min(100, (cups / 10) * 100)
}

export function normalizeSunScore(min?: number): number {
  if (min == null || min < 0) return 0
  return Math.min(100, (min / 45) * 100)
}

export function normalizeActivityScore(level?: number): number {
  if (level == null || level < 1) return 0
  return ((level - 1) / 4) * 100
}

export function computeSignalsBlend(m: DailyMetrics): number {
  const parts = [
    normalizeSleepScore(m.sleep_hours),
    normalizeHydrationScore(m.hydration_cups),
    normalizeSunScore(m.sun_minutes),
    normalizeActivityScore(m.activity_level),
  ]
  return parts.reduce((a, b) => a + b, 0) / 4
}

/** True once any habit input is non-trivial — avoids dragging daily score down before the user adjusts anything. */
export function hasMeaningfulSignals(m: DailyMetrics): boolean {
  if (m.activity_level != null && m.activity_level >= 1) return true
  if (m.sleep_hours != null && m.sleep_hours > 0) return true
  if (m.hydration_cups != null && m.hydration_cups > 0) return true
  if (m.sun_minutes != null && m.sun_minutes > 0) return true
  return false
}

/**
 * Blends protocol completion % with self-reported daily signals.
 * Weights: protocol 58%, signals 42% — keeps supplements primary while making habits meaningful.
 * If no meaningful signals yet, score equals protocol % only.
 */
export function computeCompositeReadiness(
  protocolPct: number,
  m: DailyMetrics
): { score: number; signalsBlend: number } {
  const signalsBlend = computeSignalsBlend(m)
  if (!hasMeaningfulSignals(m)) {
    return { score: protocolPct, signalsBlend: 0 }
  }
  const score = Math.min(100, Math.round(protocolPct * 0.58 + signalsBlend * 0.42))
  return { score, signalsBlend }
}

export function areCoreSignalsComplete(m: DailyMetrics): boolean {
  return (
    m.activity_level != null &&
    m.activity_level >= 1 &&
    typeof m.sleep_hours === "number" &&
    typeof m.hydration_cups === "number" &&
    typeof m.sun_minutes === "number"
  )
}

export function sleepFeedbackLine(h?: number): string {
  if (h == null || h <= 0) return "Log sleep to tune recovery."
  if (h < 6) return "Low recovery — prioritize rest when you can."
  if (h < 8) return "Solid baseline for most days."
  return "Optimal recovery range."
}

export function hydrationFeedbackLine(cups?: number): string {
  if (cups == null || cups < 0) return "Estimate cups for the day."
  if (cups < 4) return "Underhydrated — small sips add up."
  if (cups < 8) return "Adequate — keep steady through the afternoon."
  return "Well hydrated."
}

export function sunFeedbackLine(min?: number): string {
  if (min == null || min < 0) return "Rough minutes outside or by a window."
  if (min < 15) return "Light exposure helps rhythm and mood."
  if (min < 45) return "Good daylight dose."
  return "Strong light exposure — balance with recovery."
}

export function activityFeedbackLine(level?: number): string {
  if (level == null || level < 1) return "Tap your movement level today."
  if (level <= 2) return "Light day — recovery is still progress."
  if (level <= 4) return "Steady stimulus."
  return "High output — prioritize sleep and fuel."
}

/** Daily score points attributable to signals (for “+X added” copy). */
export function readinessFromSignalsOnly(signalsBlend: number): number {
  return Math.min(100, Math.round(signalsBlend * 0.42))
}
