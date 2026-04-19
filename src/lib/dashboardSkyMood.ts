/**
 * Simulated weather / time-of-day for Clarion home — not “color themes”.
 * See dashboard-sky.css for layered environments.
 *
 * **Adaptive sky (dashboard Home only):** `getDashboardSkyMood()` combines local hour + protocol
 * adherence (today’s stack X/Y, completion, days since last log). Only **late night** (~11pm–5am) forces
 * the starry `night` sky; earlier evening follows the same habit/protocol rules as daytime.
 * Optional **panel score** nudges brightness when labs are strong — never “punishes” low scores with storm.
 * Other dashboard routes use time-of-day ambient sky unless Home sets `moodOverride` via context.
 */

export type DashboardSkyMood =
  | "night"
  | "storm"
  | "drizzle"
  | "sunrise"
  | "sunset"
  | "clear"
  | "perfect"
  | "calm"

export const DASHBOARD_SKY_MOODS: readonly DashboardSkyMood[] = [
  "night",
  "storm",
  "drizzle",
  "sunrise",
  "sunset",
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
  /** Latest panel score 0–100 — soft visual nudge only */
  panelScore?: number | null
}

/**
 * True “starry night” — only late night. Daytime / evening use {@link getAmbientTimeMood} + habits.
 */
export function isStarryNightHour(hour: number): boolean {
  const h = Math.floor(hour) % 24
  return h >= 23 || h < 5
}

/**
 * Time-only sky: starry night → dawn → day → dusk → twilight. Used as the baseline when habits
 * don’t force storm/drizzle/progress skies, and for non-Home dashboard routes.
 */
export function getAmbientTimeMood(hour: number): DashboardSkyMood {
  const h = Math.floor(hour) % 24
  if (isStarryNightHour(h)) return "night"
  if (h >= 5 && h < 8) return "sunrise"
  if (h >= 8 && h < 17) return "clear"
  if (h >= 17 && h < 20) return "sunset"
  if (h >= 20 && h < 23) return "calm"
  return "night"
}

export function getDashboardSkyMood(input: DashboardSkyMoodInput): DashboardSkyMood {
  const { hour, hasStack, protocolTodayY, protocolTodayX, protocolTodayComplete, daysSinceLog } = input
  const timeMood = getAmbientTimeMood(hour)

  if (isStarryNightHour(hour)) {
    return "night"
  }

  /** Loading / unknown completion: follow the clock (was always `calm` → looked like night in dark theme). */
  if (protocolTodayComplete === null && hasStack && protocolTodayY > 0) {
    return applyScoreNudge(timeMood, input)
  }

  const hasStepsToday = protocolTodayY > 0
  const behindToday = hasStack && hasStepsToday && protocolTodayComplete !== true
  const longGap = daysSinceLog != null && daysSinceLog >= 3
  const neglected = daysSinceLog != null && daysSinceLog >= 2

  // Storm: low adherence / multi-day gap (emotional “off track”)
  if (hasStepsToday && behindToday && (longGap || (protocolTodayX === 0 && neglected))) {
    return softenStormIfRecentLog("storm", input)
  }

  // No stack / no steps — still respect time of day (sunrise / clear / sunset / calm)
  if (!hasStack || !hasStepsToday) {
    return applyScoreNudge(timeMood, input)
  }

  // 100% today — “perfect day”
  if (protocolTodayComplete === true) {
    return applyScoreNudge("perfect", input)
  }

  const ratio = protocolTodayY > 0 ? protocolTodayX / protocolTodayY : 0

  if (ratio === 0) {
    return applyScoreNudge("drizzle", input)
  }

  if (ratio < 0.5) {
    return applyScoreNudge("sunrise", input)
  }

  if (ratio < 1) {
    return applyScoreNudge("clear", input)
  }

  return applyScoreNudge(timeMood, input)
}

/** Brighter sky when score is strong and user finished protocol; never downgrade for low scores. */
function applyScoreNudge(mood: DashboardSkyMood, input: DashboardSkyMoodInput): DashboardSkyMood {
  const { panelScore, protocolTodayComplete, hour } = input
  const s = panelScore != null && Number.isFinite(panelScore) ? panelScore : null
  if (s == null || isStarryNightHour(hour)) return mood
  if (protocolTodayComplete === true && s >= 78 && (mood === "calm" || mood === "sunset")) {
    return "clear"
  }
  if (protocolTodayComplete === true && s >= 85 && mood === "clear") {
    return "perfect"
  }
  return mood
}

/** If labs look decent and user logged recently, storm → drizzle (less harsh). */
function softenStormIfRecentLog(mood: DashboardSkyMood, input: DashboardSkyMoodInput): DashboardSkyMood {
  const { daysSinceLog, panelScore } = input
  const s = panelScore != null && Number.isFinite(panelScore) ? panelScore : null
  if (mood !== "storm") return mood
  if (daysSinceLog != null && daysSinceLog <= 1 && s != null && s >= 55) {
    return "drizzle"
  }
  return mood
}
