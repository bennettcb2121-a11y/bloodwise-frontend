import type { BiomarkerResult } from "./analyzeBiomarkers"
import type { ProfileRow } from "./bloodwiseDb"

/** Structured AI panel overview (teaser + long-form for full review modal). */
export type BiomarkerOverviewPayload = {
  headline: string
  strengths: string[]
  attention: string[]
  fullOverview: string
  /** Calming explainer: what out-of-range often means + how Clarion guides (education only). */
  reassurance?: string
}

/** When the model omits reassurance, use brief copy—informative, not instructional. */
export function defaultBiomarkerReassurance(needsAttentionCount: number): string {
  if (needsAttentionCount <= 0) {
    return "The full review summarizes each marker in plain language—useful context whenever you talk with your clinician."
  }
  return "One blood draw is a snapshot; lots of things can nudge labs day to day. The full review puts these results in context and surfaces angles worth discussing with your clinician. Educational only—not a diagnosis."
}

/** Short bullets (legacy); prefer {@link buildBiomarkerTeaserInsights} for the dashboard teaser. */
export function shortInsightBulletsFromResults(results: BiomarkerResult[], max = 3): string[] {
  return buildBiomarkerTeaserInsights(results, max).map((x) => `${x.markerLabel}: ${x.valueSummary}`)
}

/** One row in the biomarkers insight card: value vs target + calm “should I worry?” line. */
export type BiomarkerTeaserInsight = {
  markerLabel: string
  /** Value, Clarion target band, and optional distance (e.g. how far above/below). */
  valueSummary: string
  /** Non-alarmist framing; education only. */
  worryLine: string
}

function formatMarkerValue(v: number): string {
  if (!Number.isFinite(v)) return "—"
  const rounded = Math.round(v * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(1).replace(/\.0$/, "")
}

function directionWord(r: BiomarkerResult): "above" | "below" | "outside" {
  if (r.status === "high") return "above"
  if (r.status === "deficient") return "below"
  if (r.status === "suboptimal") {
    if (r.optimalMin != null && r.value < r.optimalMin) return "below"
    if (r.optimalMax != null && r.value > r.optimalMax) return "above"
  }
  return "outside"
}

function gapSuffix(r: BiomarkerResult): string {
  if (r.optimalMin == null || r.optimalMax == null) return ""
  if (r.status === "high" && r.optimalMax != null && r.value > r.optimalMax) {
    const g = r.value - r.optimalMax
    return g > 0 ? ` · ${formatMarkerValue(g)} above the upper end of the target band` : ""
  }
  if (r.optimalMin != null && r.value < r.optimalMin) {
    const g = r.optimalMin - r.value
    return g > 0 ? ` · ${formatMarkerValue(g)} below the lower end of the target band` : ""
  }
  if (r.optimalMax != null && r.value > r.optimalMax && r.status === "suboptimal") {
    const g = r.value - r.optimalMax
    return g > 0 ? ` · ${formatMarkerValue(g)} above the upper end of the target band` : ""
  }
  return ""
}

function buildValueSummary(r: BiomarkerResult): string {
  const v = formatMarkerValue(r.value)
  const hasTarget = r.optimalMin != null && r.optimalMax != null
  const target = hasTarget ? `${r.optimalMin}–${r.optimalMax}` : null
  const dir = directionWord(r)
  if (!target) return `${v} — ${dir} Clarion's target band (not available for this marker)`
  return `${v} — ${dir} Clarion target ${target}${gapSuffix(r)}`
}

function worryLineForResult(r: BiomarkerResult): string {
  if (r.status === "suboptimal") {
    return "Often a modest shift—useful context, rarely something to panic about from one draw alone."
  }
  return "Usually something to interpret with your clinician—not an emergency from a single lab value alone."
}

function displayNameForMarker(name: string): string {
  return name === "25-OH Vitamin D" ? "Vitamin D" : name
}

/**
 * Top flagged markers for the insight teaser: actual value, target band, distance, and a calm worry line.
 */
export function buildBiomarkerTeaserInsights(results: BiomarkerResult[], max = 3): BiomarkerTeaserInsight[] {
  const rank = (s: string) => (s === "deficient" ? 0 : s === "suboptimal" ? 1 : s === "high" ? 2 : 9)
  const flagged = results
    .filter((r) => r.status !== "optimal" && r.status !== "unknown")
    .sort((a, b) => rank(a.status) - rank(b.status))
  return flagged.slice(0, max).map((r) => ({
    markerLabel: displayNameForMarker(r.name),
    valueSummary: buildValueSummary(r),
    worryLine: worryLineForResult(r),
  }))
}

/** First user message when generating the panel overview (must match client + API history). */
export const BIOMARKER_OVERVIEW_USER_PROMPT =
  "Please give a concise educational overview of my biomarker panel based on the snapshot in your system context. Use 3–5 short paragraphs: overall pattern, what looks favorable, what may warrant follow-up with a clinician, and a reminder that this is educational—not a diagnosis or treatment plan."

/**
 * Compact, structured snapshot for the AI (education only). Keeps token use reasonable.
 */
export function buildBiomarkerSnapshotForAi(
  results: BiomarkerResult[],
  opts: { healthScore: number; profile: ProfileRow | null }
): string {
  const lines: string[] = []
  lines.push(`Clarion health score (0–100): ${opts.healthScore}`)
  const p = opts.profile
  if (p) {
    const bits = [
      p.age?.trim() && `Age: ${p.age.trim()}`,
      p.sex?.trim() && `Sex: ${p.sex.trim()}`,
      p.sport?.trim() && `Activity: ${p.sport.trim()}`,
      p.diet_preference?.trim() && `Diet: ${p.diet_preference.trim()}`,
    ].filter(Boolean) as string[]
    if (bits.length) lines.push(`Profile: ${bits.join("; ")}`)
  }
  const sorted = [...results].sort((a, b) => a.name.localeCompare(b.name))
  const count = (s: BiomarkerResult["status"]) => sorted.filter((r) => r.status === s).length
  lines.push(
    `Counts — optimal: ${count("optimal")}, suboptimal: ${count("suboptimal")}, deficient: ${count("deficient")}, high: ${count("high")}, unknown: ${count("unknown")}`
  )
  lines.push("Markers:")
  for (const r of sorted) {
    const target =
      r.optimalMin != null && r.optimalMax != null
        ? `target ${r.optimalMin}–${r.optimalMax}`
        : "target not available"
    lines.push(`- ${r.name}: ${r.value} (${r.status}; ${target})`)
  }
  return lines.join("\n")
}
