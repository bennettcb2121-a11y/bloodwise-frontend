/**
 * Premium, clinically grounded hero copy for the dashboard — avoids startup / gamified phrasing.
 */

import type { StatusCounts } from "@/src/lib/scoreEngine"

export type PremiumNarrativeInput = {
  orderedDrivers: Array<{ markerName: string; label: string }>
  scoreDelta: number | null
  statusCounts: StatusCounts
  bloodwiseSummary: {
    overallInterpretation: string
    keyFindings: string[]
  } | null
}

export function getPremiumHeroHeadline(input: PremiumNarrativeInput): string {
  const { orderedDrivers, scoreDelta, statusCounts } = input
  const markers = orderedDrivers
    .map((d) => d.markerName)
    .filter(Boolean)
    .slice(0, 4)

  if (scoreDelta != null && scoreDelta >= 2) {
    return "Nice — your score moved up from last time"
  }
  if (scoreDelta != null && scoreDelta <= -2) {
    return "Let’s steady the course — a few markers shifted"
  }

  const opportunities = statusCounts.flagged + statusCounts.borderline
  if (opportunities >= 3) {
    return `We have work to do — you have ${opportunities} markers outside your target range`
  }
  if (opportunities === 2 && markers.length >= 2) {
    return `Two places to focus first: ${markers[0]} and ${markers[1]}`
  }
  if (opportunities === 1 && markers[0]) {
    return `${markers[0]} is where we’ll start — one clear focus`
  }
  if (statusCounts.flagged === 0 && statusCounts.optimal >= 3 && statusCounts.borderline <= 1) {
    return "You’re in a good place — most markers look solid"
  }
  return "Here’s where your latest panel stands"
}

/** Factual one-liner when the hero has no priority list (all markers in range, etc.). */
export function getHeroPositiveLine(input: {
  optimalMarkerLabels: string[]
  protocolStreakDays: number
}): string | null {
  const { optimalMarkerLabels, protocolStreakDays } = input
  if (optimalMarkerLabels.length > 0) {
    const first = optimalMarkerLabels[0]
    if (optimalMarkerLabels.length >= 2) {
      return `${first} and ${optimalMarkerLabels[1]} are in range.`
    }
    return `${first} is in range.`
  }
  if (protocolStreakDays >= 3) {
    return `${protocolStreakDays}-day protocol streak.`
  }
  return null
}

export function getPremiumHeroLede(input: PremiumNarrativeInput): string {
  const { bloodwiseSummary, orderedDrivers } = input
  if (bloodwiseSummary?.keyFindings?.length) {
    const k = bloodwiseSummary.keyFindings[0].trim()
    if (k.length > 240) return `${k.slice(0, 237)}…`
    return k
  }
  if (bloodwiseSummary?.overallInterpretation) {
    const t = bloodwiseSummary.overallInterpretation.trim()
    const m = t.match(/^[^.!?]+[.!?]/)
    if (m) return m[0].length > 260 ? `${m[0].slice(0, 257)}…` : m[0]
    return t.length > 240 ? `${t.slice(0, 237)}…` : t
  }
  const m = orderedDrivers
    .map((d) => d.markerName)
    .filter(Boolean)
    .slice(0, 3)
  if (m.length >= 2) {
    return `Start with ${m.slice(0, 2).join(" and ")}; retest to confirm change.`
  }
  return "Details are in Biomarkers and Actions below."
}

/** Short education-only tips (rotate by day); not personalized medical advice. */
export const DAILY_HEALTH_TIPS: string[] = [
  "Vitamin D often absorbs better with a meal that includes fat.",
  "Consistency matters more than perfection for supplement timing.",
  "Hydration can affect some lab values—follow your clinician’s prep instructions before draws.",
  "Logging today builds a clearer picture at your next panel—not a verdict on yesterday.",
  "If you miss a day, pick up where you left off; streaks reward return, not guilt.",
]

export function getTipOfDayStable(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000))
  const idx = dayOfYear % DAILY_HEALTH_TIPS.length
  return DAILY_HEALTH_TIPS[idx] ?? DAILY_HEALTH_TIPS[0]
}

export type MindfulProtocolRailInput = {
  hasStack: boolean
  protocolTodayY: number
  protocolTodayComplete: boolean | null
  protocolStreakDays: number
}

/** Calm copy for the rail when protocol isn’t finished or stack is empty. */
export function getMindfulProtocolRailMessage(input: MindfulProtocolRailInput): string | null {
  const { hasStack, protocolTodayY, protocolTodayComplete, protocolStreakDays } = input
  if (!hasStack) {
    return "Add supplements on Plan to track a daily rhythm here."
  }
  if (protocolTodayY <= 0) {
    return null
  }
  if (protocolTodayComplete === true) {
    return "Today’s protocol is complete—nice consistency."
  }
  if (protocolStreakDays >= 1) {
    return "No pressure—log when you can to keep your streak gentle."
  }
  return "Log your doses when ready; small check-ins add up."
}
