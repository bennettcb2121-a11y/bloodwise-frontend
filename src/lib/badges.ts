/**
 * Badges / achievements derived from protocol_log, bloodwork history, and streaks.
 * v1: client-side only (no user_badges table).
 */

export type BadgeId =
  | "first_protocol_complete"
  | "streak_7"
  | "streak_10"
  | "streak_30"
  | "first_biomarker_improved"
  | "full_week"

export type BadgeDef = {
  id: BadgeId
  name: string
  description: string
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  first_protocol_complete: {
    id: "first_protocol_complete",
    name: "First protocol logged",
    description: "You logged your first day on protocol.",
  },
  streak_7: {
    id: "streak_7",
    name: "7-day streak",
    description: "7 days in a row on protocol.",
  },
  streak_10: {
    id: "streak_10",
    name: "10-day streak",
    description: "10 days in a row on protocol.",
  },
  streak_30: {
    id: "streak_30",
    name: "30-day streak",
    description: "30 days in a row on protocol.",
  },
  first_biomarker_improved: {
    id: "first_biomarker_improved",
    name: "Biomarker improved",
    description: "A tracked biomarker moved into a better range.",
  },
  full_week: {
    id: "full_week",
    name: "Full week",
    description: "Logged protocol all 7 days in a week.",
  },
}

export type EarnedBadge = {
  id: BadgeId
  name: string
  description: string
}

/**
 * Derive earned badges from protocol history (last 30+ days), bloodwork history (for score delta), and current streak.
 * Protocol history is assumed ordered by date descending (most recent first).
 */
export function getEarnedBadges(
  protocolHistory: Array<{ log_date: string; checks: Record<string, boolean> }>,
  streakDays: number,
  bloodworkHistory?: Array<{ score?: number | null; created_at?: string }>,
  hasLoggedToday?: boolean
): EarnedBadge[] {
  const earned: EarnedBadge[] = []
  const byDate: Record<string, boolean> = {}
  protocolHistory.forEach(({ log_date, checks }) => {
    byDate[log_date] = Object.values(checks).some(Boolean)
  })

  const anyDayLogged = protocolHistory.some((d) => Object.values(d.checks).some(Boolean))
  if (anyDayLogged) earned.push(BADGES.first_protocol_complete)

  if (streakDays >= 7) earned.push(BADGES.streak_7)
  if (streakDays >= 10) earned.push(BADGES.streak_10)
  if (streakDays >= 30) earned.push(BADGES.streak_30)

  let weekCount = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (byDate[d.toISOString().slice(0, 10)]) weekCount++
  }
  if (weekCount >= 7) earned.push(BADGES.full_week)

  if (Array.isArray(bloodworkHistory) && bloodworkHistory.length >= 2) {
    const scores = bloodworkHistory
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number" && Number.isFinite(s))
    if (scores.length >= 2) {
      const first = scores[scores.length - 1]
      const last = scores[0]
      if (last > first) earned.push(BADGES.first_biomarker_improved)
    }
  }

  return earned
}
