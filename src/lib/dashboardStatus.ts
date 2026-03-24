/**
 * Dashboard command center: status strip label and "Do this first" action.
 * Used on Home to show one-glance status and single highest-impact next step.
 */

export type RetestCountdown = { type: "until" | "overdue"; weeks: number } | null

export type DashboardStatusInput = {
  orderedDriversCount: number
  protocolTodayComplete: boolean | null
  protocolStreakDays: number
  retestCountdown: RetestCountdown
  /** YYYY-MM-DD of most recent protocol log; undefined if never logged */
  lastLogDate?: string | null
  hasStack: boolean
}

export type DashboardStatusResult = {
  label: string
  href?: string
  urgency?: "neutral" | "attention" | "urgent"
}

/** One-glance status line and optional link (e.g. "On track", "3 things need attention" → Actions). */
export function getDashboardStatus(input: DashboardStatusInput): DashboardStatusResult {
  const {
    orderedDriversCount,
    protocolTodayComplete,
    protocolStreakDays,
    retestCountdown,
    lastLogDate,
    hasStack,
  } = input

  const today = new Date().toISOString().slice(0, 10)
  const daysSinceLog =
    lastLogDate != null
      ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000))
      : null

  // Streak at risk: have a streak but haven't logged today
  if (hasStack && protocolStreakDays > 0 && protocolTodayComplete !== true) {
    return {
      label: "Streak at risk — log today",
      href: "/dashboard#protocol",
      urgency: "urgent",
    }
  }

  // Haven't logged in 2+ days (and they have a stack to log)
  if (hasStack && daysSinceLog != null && daysSinceLog >= 2) {
    return {
      label: `You haven't logged in ${daysSinceLog} days`,
      href: "/dashboard#protocol",
      urgency: "attention",
    }
  }

  // Retest soon (within 2 weeks)
  if (retestCountdown && retestCountdown.type === "until" && retestCountdown.weeks <= 2) {
    return {
      label:
        retestCountdown.weeks <= 0
          ? "Suggested retest soon"
          : `${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""} until suggested retest`,
      href: "/?step=labs",
      urgency: "attention",
    }
  }

  // Biomarkers need attention
  if (orderedDriversCount > 0) {
    const count = orderedDriversCount
    return {
      label: count === 1 ? "1 thing needs attention" : `${count} things need attention`,
      href: "/dashboard/actions",
      urgency: "attention",
    }
  }

  return { label: "On track", urgency: "neutral" }
}

export type DoThisFirstInput = {
  orderedDrivers: Array<{ markerName: string; label: string }>
  protocolTodayComplete: boolean | null
  hasStack: boolean
}

export type DoThisFirstResult = {
  title: string
  line: string
  href: string
}

/** Single highest-impact next action for "Do this first" card. */
export function getDoThisFirst(input: DoThisFirstInput): DoThisFirstResult | null {
  const { orderedDrivers, protocolTodayComplete, hasStack } = input

  // Prioritize logging protocol if they have a stack and haven't logged today
  if (hasStack && protocolTodayComplete !== true) {
    return {
      title: "Complete today's plan",
      line: "Check off your stack and keep your streak.",
      href: "/dashboard#protocol",
    }
  }

  // Else top biomarker priority
  const first = orderedDrivers[0]
  if (first) {
    const marker = first.markerName
    return {
      title: `Focus on ${marker}`,
      line: `Your biggest lever for a higher score. See what to do.`,
      href: "/dashboard/actions",
    }
  }

  return null
}

export type TodayContextInput = {
  protocolTodayComplete: boolean | null
  protocolStreakDays: number
  retestCountdown: RetestCountdown
  lastLogDate: string | null | undefined
  hasStack: boolean
  lastBloodworkAt: string | null | undefined
  retestWeeks: number
  firstGuide: { biomarkerKey: string; slug: string } | null
}

export type TodayTaskSlot = {
  title: string
  line: string
  ctaType: "log" | "view" | "calendar" | "guide" | "none"
  ctaHref?: string
  ctaLabel?: string
  ctaExternal?: boolean
}

/** Context-aware copy and CTA for "Your 3 for today" task 1 (log protocol) and task 3 (third slot). */
export function getTodayContext(input: TodayContextInput): {
  task1: { title: string; line: string }
  task3: TodayTaskSlot
} {
  const {
    protocolTodayComplete,
    protocolStreakDays,
    retestCountdown,
    lastLogDate,
    hasStack,
    lastBloodworkAt,
    retestWeeks,
    firstGuide,
  } = input

  const today = new Date().toISOString().slice(0, 10)
  const daysSinceLog =
    lastLogDate != null
      ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000))
      : null

  // Task 1: Log protocol card
  let task1Title = "Complete today's plan"
  let task1Line = "Check off your stack and keep your streak."
  if (protocolTodayComplete === true) {
    task1Title = "You're done for today"
    task1Line =
      protocolStreakDays > 0 ? `${protocolStreakDays}-day streak — keep it going.` : "Nice work."
  } else if (hasStack && protocolStreakDays === 6) {
    task1Line = "One more day for 7-day streak."
  } else if (hasStack && daysSinceLog != null && daysSinceLog >= 2 && lastLogDate) {
    const fmt = new Date(lastLogDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    task1Line = `You haven't logged since ${fmt}. Quick log?`
  }

  // Task 3: Third slot — priority order: log if streak at risk, retest calendar, guide, on track
  let task3: TodayTaskSlot = {
    title: "You're on track",
    line: "No urgent action right now.",
    ctaType: "none",
  }
  if (protocolTodayComplete === false && protocolStreakDays > 0) {
    task3 = {
      title: "Log today's protocol",
      line: protocolStreakDays === 6 ? "One more day for 7-day streak." : "Keep your streak going.",
      ctaType: "log",
      ctaHref: "/dashboard#protocol",
      ctaLabel: "Log now",
    }
  } else if (
    retestCountdown &&
    retestCountdown.type === "until" &&
    retestCountdown.weeks <= 4 &&
    lastBloodworkAt
  ) {
    const due = new Date(lastBloodworkAt)
    due.setDate(due.getDate() + retestWeeks * 7)
    const start = due.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
    const end = new Date(due.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Clarion+retest+due&dates=${start}/${end}`
    task3 = {
      title: "Add retest to calendar",
      line: retestCountdown.weeks <= 2 ? "Suggested retest soon — don't forget." : "So you don't forget.",
      ctaType: "calendar",
      ctaHref: calendarUrl,
      ctaLabel: "Add to calendar",
      ctaExternal: true,
    }
  } else if (firstGuide) {
    task3 = {
      title: `Read the ${firstGuide.biomarkerKey.toLowerCase()} guide`,
      line: "Learn how to support this marker.",
      ctaType: "guide",
      ctaHref: `/guides/${firstGuide.slug}`,
      ctaLabel: "Read guide",
    }
  }

  return { task1: { title: task1Title, line: task1Line }, task3 }
}
