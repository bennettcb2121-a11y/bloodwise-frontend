/**
 * Priority and focus: status tone, top-focus list, why-it-matters and next-step copy.
 */

export type StatusTone = {
  label: string
  className: string
  icon: string
}

export type PrioritySummary = {
  biggestDrag: string
  strongestMarker: string
  nextBestAction: string
}

export type AnalysisItem = {
  status?: string
  name?: string
  marker?: string
  value?: number
  whyItMatters?: string
  [key: string]: unknown
}

export function getStatusTone(status?: string): StatusTone {
  const s = (status || "").toLowerCase()

  if (s === "optimal" || s === "normal" || s === "in range") {
    return { label: "Optimal", className: "tone-green", icon: "●" }
  }
  if (s === "suboptimal" || s === "borderline") {
    return { label: "Borderline", className: "tone-amber", icon: "●" }
  }
  if (s === "deficient") {
    return { label: "Deficient", className: "tone-red", icon: "↓" }
  }
  if (s === "high") {
    return { label: "High", className: "tone-red", icon: "↑" }
  }

  return { label: status || "Review", className: "tone-neutral", icon: "•" }
}

export function buildTopFocus<T extends AnalysisItem>(analysis: T[]): T[] {
  return analysis
    .filter((item) => {
      const s = (item.status || "").toLowerCase()
      return s === "deficient" || s === "suboptimal" || s === "high"
    })
    .slice(0, 3) as T[]
}

export function inferWhyItMatters(marker: string): string {
  const normalized = marker.toLowerCase()

  if (normalized.includes("ferritin")) {
    return "Iron stores can directly affect endurance, oxygen delivery, and fatigue resistance."
  }
  if (normalized.includes("vitamin d")) {
    return "Vitamin D influences recovery, bone health, immunity, and training resilience."
  }
  if (normalized.includes("magnesium")) {
    return "Magnesium supports muscle function, nervous system balance, and recovery quality."
  }
  if (normalized.includes("b12")) {
    return "B12 supports red blood cell production, energy metabolism, and neurological function."
  }
  if (normalized.includes("crp")) {
    return "CRP helps contextualize inflammation, recovery stress, and systemic load."
  }
  if (normalized.includes("testosterone")) {
    return "Testosterone can influence readiness, adaptation, and recovery context."
  }

  return "This marker can influence performance, energy, and recovery."
}

export function inferNextStep(marker: string, status?: string): string {
  const normalized = marker.toLowerCase()
  const s = (status || "").toLowerCase()

  if (normalized.includes("ferritin")) {
    if (s === "deficient" || s === "suboptimal") {
      return "Prioritize iron-status follow-up and an iron plan if appropriate."
    }
    if (s === "high") {
      return "Avoid iron supplementation. Monitor and retest to confirm trend."
    }
    return "No iron supplementation needed. Maintain and retest on schedule."
  }

  if (normalized.includes("vitamin d")) {
    return s === "deficient" || s === "suboptimal"
      ? "Use structured vitamin D support and recheck after a consistent intake period."
      : "Maintain intake and monitor."
  }

  if (normalized.includes("magnesium")) {
    return s === "deficient" || s === "suboptimal"
      ? "Improve daily intake and watch sleep, soreness, and muscle function."
      : "Maintain and monitor."
  }

  if (normalized.includes("crp")) {
    return s === "high"
      ? "Review training stress, illness, sleep, and inflammation-support strategy."
      : "Watch the trend over time."
  }

  if (normalized.includes("b12")) {
    return s === "deficient" || s === "suboptimal"
      ? "Review intake and absorption context, then retest."
      : "Maintain and monitor."
  }

  return "Review in context and plan the next action step."
}

export function getPrioritySummary(
  analysisResults: AnalysisItem[],
  topFocus: AnalysisItem[]
): PrioritySummary {
  const biggestDrag =
    topFocus[0]?.name || topFocus[0]?.marker || "No major flags"
  const strongestMarker =
    analysisResults.find(
      (item) => (item.status || "").toLowerCase() === "optimal"
    )?.name || "No clear leader"
  const nextBestAction =
    topFocus.length > 0
      ? inferNextStep(
          String(topFocus[0].name || topFocus[0].marker || "marker"),
          topFocus[0].status
        )
      : "Maintain current habits and retest on schedule."

  return { biggestDrag, strongestMarker, nextBestAction }
}
