/**
 * Simulated weather / time-of-day for Clarion home — not “color themes”.
 * See dashboard-sky.css for layered environments.
 */

export type DashboardSkyMood =
  | "night"
  | "storm"
  | "drizzle"
  | "sunrise"
  | "clear"
  | "perfect"
  | "calm"

export const DASHBOARD_SKY_MOODS: readonly DashboardSkyMood[] = [
  "night",
  "storm",
  "drizzle",
  "sunrise",
  "clear",
  "perfect",
  "calm",
] as const

export function isDashboardSkyMood(s: string | null): s is DashboardSkyMood {
  return s != null && (DASHBOARD_SKY_MOODS as readonly string[]).includes(s)
}

export type DashboardSkyMoodInput = {
  hour: number
  hasStack: boolean
  protocolTodayY: number
  protocolTodayX: number
  protocolTodayComplete: boolean | null
  daysSinceLog: number | null
}

function isNightHour(hour: number): boolean {
  return hour >= 20 || hour < 6
}

export function getDashboardSkyMood(input: DashboardSkyMoodInput): DashboardSkyMood {
  const { hour, hasStack, protocolTodayY, protocolTodayX, protocolTodayComplete, daysSinceLog } = input

  if (isNightHour(hour)) {
    return "night"
  }

  if (protocolTodayComplete === null && hasStack && protocolTodayY > 0) {
    return "calm"
  }

  const hasStepsToday = protocolTodayY > 0
  const behindToday = hasStack && hasStepsToday && protocolTodayComplete !== true
  const longGap = daysSinceLog != null && daysSinceLog >= 3
  const neglected = daysSinceLog != null && daysSinceLog >= 2

  // Storm: low adherence / multi-day gap (emotional “off track”)
  if (hasStepsToday && behindToday && (longGap || (protocolTodayX === 0 && neglected))) {
    return "storm"
  }

  // No stack / no steps configured — neutral “open sky”
  if (!hasStack || !hasStepsToday) {
    return "calm"
  }

  // 100% today — “perfect day”
  if (protocolTodayComplete === true) {
    return "perfect"
  }

  const ratio = protocolTodayY > 0 ? protocolTodayX / protocolTodayY : 0

  if (ratio === 0) {
    return "drizzle"
  }

  if (ratio < 0.5) {
    return "sunrise"
  }

  if (ratio < 1) {
    return "clear"
  }

  return "calm"
}
