/**
 * Challenge definitions and progress helpers.
 * Progress is computed from protocol_log and optionally bloodwork history — no new table required for v1.
 */

export type ChallengeRule = "protocol_streak" | "protocol_week" | "first_retest" | "improve_marker"

export type ChallengeDef = {
  id: string
  name: string
  description: string
  rule: ChallengeRule
  target: number
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: "supplement_streak_10",
    name: "10-day supplement streak",
    description: "Take all your supplements 10 days in a row.",
    rule: "protocol_streak",
    target: 10,
  },
  {
    id: "protocol_streak_30",
    name: "30-day supplement streak",
    description: "Log your protocol 30 days in a row.",
    rule: "protocol_streak",
    target: 30,
  },
  {
    id: "protocol_week_7",
    name: "Full week on protocol",
    description: "Log your protocol 7 days in one week.",
    rule: "protocol_week",
    target: 7,
  },
  {
    id: "first_retest",
    name: "First retest",
    description: "Add a second bloodwork panel to see your trends.",
    rule: "first_retest",
    target: 1,
  },
  {
    id: "improve_marker",
    name: "Improve one marker",
    description: "Move any biomarker from suboptimal to optimal between two panels.",
    rule: "improve_marker",
    target: 1,
  },
]

export type DayCompletedMap = Record<string, boolean>

/** Compute current progress for protocol_streak: consecutive days from today backward. */
export function getProtocolStreakProgress(byDate: DayCompletedMap): number {
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (byDate[dateStr]) streak++
    else break
  }
  return streak
}

/** Compute days completed in the last 7 days (this week). */
export function getProtocolWeekProgress(byDate: DayCompletedMap): number {
  let count = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (byDate[d.toISOString().slice(0, 10)]) count++
  }
  return count
}

export type ChallengeExtraInput = {
  bloodworkCount?: number
  /** True if any marker improved from non-optimal to optimal between the two most recent saves. */
  markerImproved?: boolean
}

export function getChallengeProgress(
  challenge: ChallengeDef,
  byDate: DayCompletedMap,
  extra?: ChallengeExtraInput
): { current: number; completed: boolean } {
  let current = 0
  if (challenge.rule === "protocol_streak") {
    current = getProtocolStreakProgress(byDate)
  } else if (challenge.rule === "protocol_week") {
    current = getProtocolWeekProgress(byDate)
  } else if (challenge.rule === "first_retest") {
    current = (extra?.bloodworkCount ?? 0) >= 2 ? 1 : 0
  } else if (challenge.rule === "improve_marker") {
    current = extra?.markerImproved ? 1 : 0
  }
  return { current, completed: current >= challenge.target }
}

/** Whether any biomarker improved from non-optimal to optimal between two most recent bloodwork saves. */
export function didMarkerImprove(
  bloodworkHistory: Array<{ biomarker_inputs?: Record<string, string | number> }>,
  getStatus: (markerName: string, value: number) => string
): boolean {
  if (bloodworkHistory.length < 2) return false
  const [older, newer] = bloodworkHistory.slice(-2)
  const oldInputs = older?.biomarker_inputs ?? {}
  const newInputs = newer?.biomarker_inputs ?? {}
  for (const markerName of Object.keys(newInputs)) {
    const v = newInputs[markerName]
    if (v === "" || v == null) continue
    const num = Number(v)
    if (Number.isNaN(num)) continue
    const newStatus = getStatus(markerName, num)
    if (newStatus !== "optimal") continue
    const oldVal = oldInputs[markerName]
    if (oldVal === "" || oldVal == null) continue
    const oldNum = Number(oldVal)
    if (Number.isNaN(oldNum)) continue
    const oldStatus = getStatus(markerName, oldNum)
    if (oldStatus !== "optimal" && (oldStatus === "deficient" || oldStatus === "suboptimal" || oldStatus === "high" || oldStatus === "low")) return true
  }
  return false
}

/** Compute extra challenge input from bloodwork history and profile (for first_retest and improve_marker). */
export function getChallengeExtra(
  bloodworkHistory: Array<{ biomarker_inputs?: Record<string, string | number> }>,
  analyzeFn: (inputs: Record<string, string | number>, profile: Record<string, unknown>) => Array<{ name?: string; status?: string }>
): ChallengeExtraInput {
  const bloodworkCount = bloodworkHistory.length
  let markerImproved = false
  if (bloodworkHistory.length >= 2) {
    const [older, newer] = bloodworkHistory.slice(-2)
    const oldInputs = older?.biomarker_inputs ?? {}
    const newInputs = newer?.biomarker_inputs ?? {}
    const profile = {}
    const oldResults = analyzeFn(oldInputs, profile)
    const newResults = analyzeFn(newInputs, profile)
    const oldByMarker: Record<string, string> = {}
    oldResults.forEach((r) => {
      const name = r.name ?? ""
      if (name) oldByMarker[name] = (r.status ?? "").toLowerCase()
    })
    for (const r of newResults) {
      const name = r.name ?? ""
      const newStatus = (r.status ?? "").toLowerCase()
      if (newStatus !== "optimal") continue
      const oldStatus = oldByMarker[name]
      if (oldStatus && oldStatus !== "optimal") {
        markerImproved = true
        break
      }
    }
  }
  return { bloodworkCount, markerImproved }
}
