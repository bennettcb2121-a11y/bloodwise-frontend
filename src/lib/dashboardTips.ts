/**
 * Rotating tips for the dashboard "From the research" / "Tip" line.
 * Picked by day of week so the same tip shows all day.
 */

export const DASHBOARD_TIPS: string[] = [
  "Vitamin D absorbs better with a meal.",
  "Ferritin is best retested 8–12 weeks after starting iron.",
  "Magnesium can support sleep when taken in the evening.",
  "B12 levels can take weeks to reflect supplement changes—retest after a few months.",
  "Taking iron with vitamin C may improve absorption; avoid coffee or tea at the same time.",
  "Consistent supplement timing helps with adherence and steady levels.",
  "Discuss any new supplement with your clinician, especially if you take other medications.",
  "Bloodwork in the morning (fasting when required) often gives the most consistent results.",
]

/** Returns the tip for today (stable per day of year so it doesn't change on every render). */
export function getTodaysTip(): string {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000)
  )
  const index = dayOfYear % DASHBOARD_TIPS.length
  return DASHBOARD_TIPS[index] ?? DASHBOARD_TIPS[0]
}

/** Default dose or action text by marker for Today's Focus when no stack dose is present. */
const TODAY_FOCUS_DEFAULT_BY_MARKER: Record<string, string> = {
  Magnesium: "200–400mg",
  "Vitamin D": "get sunlight or supplement",
  "25-OH Vitamin D": "get sunlight or supplement",
  Ferritin: "as recommended",
  "hs-CRP": "start inflammation protocol",
  CRP: "start inflammation protocol",
  ESR: "start inflammation protocol",
}

export type TodayFocusAction = { label: string }

export type TodayFocusIcon = "sun" | "pill" | "flame"

function inferIconFromLabel(label: string): TodayFocusIcon {
  const l = label.toLowerCase()
  if (l.includes("sunlight") || l.includes("vitamin d") || l.includes("sun")) return "sun"
  if (l.includes("inflammation") || l.includes("crp")) return "flame"
  return "pill"
}

/**
 * Build 3 actionable Today's Focus lines from score drivers and optional stack (for dose).
 * e.g. "Take magnesium (200–400mg)", "Start inflammation protocol", "Get sunlight or supplement Vitamin D"
 */
const INFLAMMATION_FOCUS_LABEL = "Start inflammation protocol"

export function getTodayFocusActions(
  scoreDrivers: { markerName: string }[],
  stackSnapshot?: { stack?: { supplementName?: string; dose?: string; marker?: string }[] } | null
): TodayFocusAction[] {
  const stack = stackSnapshot?.stack ?? []
  const seen = new Set<string>()
  const actions: TodayFocusAction[] = []

  for (const driver of scoreDrivers.slice(0, 5)) {
    if (actions.length >= 3) break
    const name = (driver.markerName ?? "").trim()
    if (!name || seen.has(name.toLowerCase())) continue

    const lower = name.toLowerCase()
    if (lower.includes("crp") || lower.includes("esr") || lower === "inflammation") {
      seen.add(name.toLowerCase())
      if (!actions.some((a) => a.label === INFLAMMATION_FOCUS_LABEL)) {
        actions.push({ label: INFLAMMATION_FOCUS_LABEL })
      }
      continue
    }
    if (lower.includes("vitamin d") || name === "25-OH Vitamin D") {
      seen.add(name.toLowerCase())
      actions.push({ label: "Get sunlight or supplement Vitamin D" })
      continue
    }
    const stackItem = stack.find(
      (s) =>
        (s.marker ?? "").toLowerCase() === name.toLowerCase() ||
        (s.supplementName ?? "").toLowerCase().includes(name.toLowerCase())
    )
    const dose = stackItem?.dose?.trim() || TODAY_FOCUS_DEFAULT_BY_MARKER[name]
    const supplementLabel = name === "Ferritin" ? "iron" : name.toLowerCase()
    if (
      dose &&
      dose !== "support inflammation reduction" &&
      dose !== "start inflammation protocol" &&
      dose !== "get sunlight or supplement"
    ) {
      actions.push({ label: `Take ${supplementLabel} (${dose})` })
    } else if (!dose || dose === "as recommended") {
      actions.push({ label: `Take ${supplementLabel} (as recommended)` })
    }
    seen.add(name.toLowerCase())
  }

  return actions.slice(0, 3)
}

/** Same as getTodayFocusActions but with icons for dashboard “today” cards (sun / pill / flame). */
export function getTodayFocusActionsWithIcons(
  scoreDrivers: { markerName: string }[],
  stackSnapshot?: { stack?: { supplementName?: string; dose?: string; marker?: string }[] } | null
): { label: string; icon: TodayFocusIcon; showSeeHow?: boolean }[] {
  return getTodayFocusActions(scoreDrivers, stackSnapshot).map((a) => ({
    label: a.label,
    icon: inferIconFromLabel(a.label),
    showSeeHow: a.label.toLowerCase().includes("inflammation"),
  }))
}

export type TodayFocusWithIcon = { label: string; icon: TodayFocusIcon; showSeeHow?: boolean }

/** First action = featured “start here”; rest = secondary list (clear priority). */
export function splitFeaturedTodayActions(actions: TodayFocusWithIcon[]): {
  featured: TodayFocusWithIcon | null
  others: TodayFocusWithIcon[]
} {
  if (actions.length === 0) return { featured: null, others: [] }
  return { featured: actions[0] ?? null, others: actions.slice(1) }
}

/**
 * Short friction-busting line for the featured action card.
 * When we know stack size, step count matches real checklist length.
 */
export function getFeaturedMicrocopy(
  action: TodayFocusWithIcon,
  stackStepCount?: number | null
): string {
  if (stackStepCount != null && stackStepCount > 0) {
    return `${stackStepCount} step${stackStepCount !== 1 ? "s" : ""} • ~2 min`
  }
  const l = action.label.toLowerCase()
  if (l.includes("inflammation") || l.includes("protocol")) return "3 steps • ~2 min"
  if (l.includes("sunlight") || l.includes("vitamin d")) return "2–3 min • quick win"
  if (l.includes("take ")) return "~2 min • quick win"
  return "3 steps • ~2 min"
}
