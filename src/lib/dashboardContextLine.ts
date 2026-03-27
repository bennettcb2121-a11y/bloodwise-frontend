import { getTodaysTip } from "@/src/lib/dashboardTips"

export type RetestCountdownArg = { type: "until" | "overdue"; weeks: number } | null

/**
 * Prefer a line tied to the user’s panel and dates; fall back to a generic research tip.
 */
export function getContextualInsight(args: {
  orderedDrivers: Array<{ markerName: string }>
  analysisResults: Array<{ name?: string; value?: number }>
  reportDateRelative: string | null
  retestCountdown: RetestCountdownArg
}): string {
  const first = args.orderedDrivers[0]
  if (first?.markerName?.trim()) {
    const name = first.markerName.trim()
    const match = args.analysisResults.find(
      (r) => (r.name ?? "").toLowerCase() === name.toLowerCase()
    )
    const val =
      match && typeof match.value === "number" && !Number.isNaN(match.value)
        ? ` at ${match.value}`
        : ""
    const date = args.reportDateRelative ? ` (${args.reportDateRelative})` : ""
    return `Focus: ${name}${val}${date}.`
  }
  if (args.retestCountdown) {
    if (args.retestCountdown.type === "until") {
      return `Next suggested retest in ${args.retestCountdown.weeks} week${args.retestCountdown.weeks !== 1 ? "s" : ""}.`
    }
    return `Suggested retest was ${args.retestCountdown.weeks} week${args.retestCountdown.weeks !== 1 ? "s" : ""} ago.`
  }
  return getTodaysTip()
}
