/**
 * Clarion Summary: plain-language overall interpretation,
 * key biomarker findings, and top priority actions for athletes and health-conscious users.
 */

import { resolveActionPlanDbKey } from "@/src/lib/actionPlans"
import type { PrioritySummary } from "@/src/lib/priorityEngine"

export type { PrioritySummary }

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

/** Plain-language band for narrative copy (not the short UI label from scoreEngine). */
function narrativeScoreBand(score: number): string {
  if (score >= 90) return "strong overall"
  if (score >= 75) return "mostly solid, with a few levers left to tune"
  if (score >= 60) return "mixed—clear wins alongside a few priorities"
  return "several markers worth attention soon"
}

/**
 * Build a concise Clarion Summary from analysis and derived data.
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

  // —— Overall interpretation (Clarion voice: calm, direct, one clear read) ——
  const band = narrativeScoreBand(score)
  const total = statusCounts.optimal + statusCounts.borderline + statusCounts.flagged
  let overallInterpretation: string

  if (total === 0) {
    overallInterpretation =
      "Add your lab values to generate a Clarion read: how your results sit against your targets, what to watch first, and what to discuss with your clinician."
  } else if (statusCounts.flagged > 0 && statusCounts.optimal === 0) {
    overallInterpretation = `Clarion reads this panel as ${band}: multiple markers sit outside your Clarion target band. Start with the priorities below—lifestyle first where it applies, then targeted support only where it fits your clinician’s plan.`
  } else if (statusCounts.optimal >= total - 1 && statusCounts.flagged === 0) {
    overallInterpretation = `Clarion reads this panel as ${band}. Most markers align with your targets.${statusCounts.borderline > 0 ? ` A few are borderline—small shifts in training load, sleep, or nutrition often help.` : " Keep habits steady and retest on the schedule that makes sense for you."}`
  } else {
    overallInterpretation = `Clarion reads this panel as ${band}: ${statusCounts.optimal} marker${statusCounts.optimal === 1 ? "" : "s"} on target${statusCounts.borderline > 0 ? `, ${statusCounts.borderline} borderline` : ""}${statusCounts.flagged > 0 ? `, ${statusCounts.flagged} needing attention` : ""}. The sections below stack-rank what matters for you.`
  }

  // —— Key findings ——
  if (prioritySummary.biggestDrag && prioritySummary.biggestDrag !== "No major flags") {
    keyFindings.push(
      `Lead priority: ${prioritySummary.biggestDrag}. Clarion weights this marker highest for your score—small wins here usually echo across how you train and recover.`
    )
  }
  if (prioritySummary.strongestMarker && prioritySummary.strongestMarker !== "No clear leader") {
    keyFindings.push(
      `${prioritySummary.strongestMarker} looks strong relative to your Clarion target—keep it stable while you work the gaps below.`
    )
  }
  if (topFocus.length > 0) {
    const names = topFocus
      .map((f) => resolveActionPlanDbKey(String(f.name || f.marker || "marker").trim()))
      .slice(0, 3)
    const list = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]}, ${names[1]}, and ${names[2]}`
    keyFindings.push(
      `Next in line: ${list}. Pair food, sleep, and training levers with your clinician’s guidance before stacking new supplements.`
    )
  }
  if (statusCounts.optimal > 0 && keyFindings.length < 3) {
    keyFindings.push(`${statusCounts.optimal} marker${statusCounts.optimal === 1 ? "" : "s"} already sit in Clarion’s target band—that’s your anchor.`)
  }
  if (detectedPatterns.length > 0 && keyFindings.length < 4) {
    const topPattern = detectedPatterns[0]
    keyFindings.push(
      `Pattern note: “${topPattern.title}.” Clarion flags when multiple markers move together—often easier to fix as a cluster than one lab at a time.`
    )
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
    topPriorityActions.push("Book a retest window (often 8–12 weeks after changes) so you can see if your Clarion score moves with you.")
  }
  if (topPriorityActions.length < 2) {
    topPriorityActions.push(
      "Keep recovery, nutrition, and training consistent between labs—Clarion is most useful when panels are comparable."
    )
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
