/**
 * One-line copy for the panel score centerpiece + minimal contributor arrows.
 */

export function getPanelScoreInterpretation(score: number): string {
  if (score >= 92) return "Most markers align with your targets"
  if (score >= 82) return "Solid range — a few markers can still improve"
  if (score >= 72) return "On track — prioritize flagged markers in your plan"
  if (score >= 60) return "Room to improve — focus on drivers below"
  if (score >= 48) return "Several markers need attention — use your action list"
  if (score >= 35) return "Prioritize out-of-range markers and retest on schedule"
  return "Baseline set — follow your plan and retest to track change"
}

/** Compact arrow for score-limiting markers in the hero (not clinical). */
export function contributorArrowForStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === "deficient" || s === "low" || s === "high") return "↓"
  if (s === "suboptimal") return "↔"
  return "·"
}
