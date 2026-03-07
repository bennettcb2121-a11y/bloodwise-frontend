/**
 * Bloodwise Summary: plain-language overall interpretation,
 * key biomarker findings, and top priority actions for athletes and health-conscious users.
 */

export type BiomarkerResult = {
  name?: string
  marker?: string
  status?: string
  value?: number
  [key: string]: unknown
}

export type StatusCounts = {
  optimal: number
  borderline: number
  flagged: number
  unknown: number
}

export type FocusItem = {
  name?: string
  marker?: string
  status?: string
  value?: number
  [key: string]: unknown
}

export type PrioritySummary = {
  biggestDrag: string
  strongestMarker: string
  nextBestAction: string
}

export type DetectedPattern = {
  title: string
  focusActions: string[]
  significance: string
}

export type BloodwiseSummaryInput = {
  analysisResults: BiomarkerResult[]
  score: number
  statusCounts: StatusCounts
  topFocus: FocusItem[]
  prioritySummary: PrioritySummary
  detectedPatterns?: DetectedPattern[]
}

export type BloodwiseSummary = {
  overallInterpretation: string
  keyFindings: string[]
  topPriorityActions: string[]
}

function scoreToLabel(score: number): string {
  if (score >= 90) return "in strong shape"
  if (score >= 75) return "generally solid with a few areas to tune"
  if (score >= 60) return "mixed—some clear wins and some areas that need attention"
  return "showing several areas that are worth addressing soon"
}

/**
 * Build a concise Bloodwise Summary from analysis and derived data.
 * Plain language for athletes and health-conscious users.
 */
export function getBloodwiseSummary(input: BloodwiseSummaryInput): BloodwiseSummary {
  const {
    analysisResults,
    score,
    statusCounts,
    topFocus,
    prioritySummary,
    detectedPatterns = [],
  } = input

  const keyFindings: string[] = []
  const topPriorityActions: string[] = []

  // —— Overall interpretation ——
  const label = scoreToLabel(score)
  const total = statusCounts.optimal + statusCounts.borderline + statusCounts.flagged
  let overallInterpretation: string

  if (total === 0) {
    overallInterpretation =
      "Your panel is in. Once we’ve interpreted your results, we’ll give you a clear picture of where you stand and what to do next."
  } else if (statusCounts.flagged > 0 && statusCounts.optimal === 0) {
    overallInterpretation = `Right now your bloodwork is ${label}. Several markers are out of range or need attention. Focusing on the biggest levers first—recovery, nutrition, and any targeted support—will move the needle most.`
  } else if (statusCounts.optimal >= total - 1 && statusCounts.flagged === 0) {
    overallInterpretation = `Overall your results look ${label}. Most markers are in a good range. ${statusCounts.borderline > 0 ? "A couple could be fine-tuned for performance and recovery." : "Keep doing what you’re doing and retest on schedule."}`
  } else {
    overallInterpretation = `Your bloodwork is ${label}. You have ${statusCounts.optimal} marker${statusCounts.optimal === 1 ? "" : "s"} in a good range${statusCounts.borderline > 0 ? `, ${statusCounts.borderline} borderline` : ""}${statusCounts.flagged > 0 ? `, and ${statusCounts.flagged} that need attention` : ""}. The summary below highlights what matters most and what to do next.`
  }

  // —— Key findings ——
  if (prioritySummary.biggestDrag && prioritySummary.biggestDrag !== "No major flags") {
    keyFindings.push(`Your biggest opportunity right now is ${prioritySummary.biggestDrag}—addressing it will likely have the largest impact on how you feel and perform.`)
  }
  if (prioritySummary.strongestMarker && prioritySummary.strongestMarker !== "No clear leader") {
    keyFindings.push(`${prioritySummary.strongestMarker} is in a good place; use it as a baseline and keep it there while you work on other areas.`)
  }
  if (topFocus.length > 0) {
    const names = topFocus.map((f) => f.name || f.marker || "marker").slice(0, 3)
    const list = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]}, ${names[1]}, and ${names[2]}`
    keyFindings.push(`Markers that need the most attention: ${list}. These are where targeted changes (diet, supplements, recovery) can make a real difference.`)
  }
  if (statusCounts.optimal > 0 && keyFindings.length < 3) {
    keyFindings.push(`${statusCounts.optimal} of your markers are in an optimal or solid range—that’s a good foundation to build on.`)
  }
  if (detectedPatterns.length > 0 && keyFindings.length < 4) {
    const topPattern = detectedPatterns[0]
    keyFindings.push(`We detected a "${topPattern.title}" pattern in your results. Addressing this pattern as a whole often works better than chasing one marker at a time.`)
  }

  // —— Top priority actions ——
  if (prioritySummary.nextBestAction && prioritySummary.nextBestAction !== "Maintain current habits and retest on schedule.") {
    topPriorityActions.push(prioritySummary.nextBestAction)
  }
  if (detectedPatterns.length > 0) {
    const firstActions = detectedPatterns[0].focusActions.slice(0, 2)
    firstActions.forEach((action) => {
      if (!topPriorityActions.includes(action)) topPriorityActions.push(action)
    })
  }
  if (topFocus.length > 0 && topPriorityActions.length < 3) {
    topPriorityActions.push("Plan a retest in 8–12 weeks so you can see whether your changes are moving the needle.")
  }
  if (topPriorityActions.length < 2) {
    topPriorityActions.push("Keep training, recovery, and nutrition consistent, and retest on the schedule we suggested for each marker.")
  }

  // Dedupe and cap actions
  const seen = new Set<string>()
  const uniqueActions = topPriorityActions.filter((a) => {
    const k = a.slice(0, 60)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return {
    overallInterpretation,
    keyFindings: keyFindings.slice(0, 5),
    topPriorityActions: uniqueActions.slice(0, 5),
  }
}
