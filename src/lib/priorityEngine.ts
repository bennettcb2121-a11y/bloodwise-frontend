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

  if (s === "unknown") {
    return { label: "Not in library", className: "tone-neutral", icon: "?" }
  }
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
  if (normalized.includes("vitamin d") || normalized.includes("vitd")) {
    return "Vitamin D influences recovery, bone health, immunity, and training resilience."
  }
  if (normalized.includes("magnesium")) {
    return "Magnesium supports muscle function, nervous system balance, and recovery quality."
  }
  if (normalized.includes("b12") || normalized.includes("cobalamin")) {
    return "B12 supports red blood cell production, energy metabolism, and neurological function."
  }
  if (normalized.includes("crp") || normalized.includes("hscrp")) {
    return "CRP helps contextualize inflammation, recovery stress, and systemic load."
  }
  if (normalized.includes("testosterone")) {
    return "Testosterone can influence readiness, adaptation, and recovery context."
  }
  if (normalized.includes("hemoglobin") || normalized.includes("hematocrit") || normalized.includes("rbc")) {
    return "Red blood cell markers reflect oxygen-carrying capacity and anemia risk."
  }
  if (normalized.includes("serum iron") || normalized.includes("tibc") || normalized.includes("transferrin")) {
    return "Iron studies help confirm deficiency and guide safe repletion."
  }
  if (normalized.includes("hba1c") || normalized.includes("glucose") || normalized.includes("fasting insulin") || normalized.includes("insulin")) {
    return "Glycemic and metabolic markers affect energy, body composition, and long-term health."
  }
  if (normalized.includes("triglyceride") || normalized.includes("hdl") || normalized.includes("ldl") || normalized.includes("cholesterol") || normalized.includes("apob") || normalized.includes("lipoprotein")) {
    return "Lipids and ApoB influence cardiovascular risk and metabolic health."
  }
  if (normalized.includes("tsh") || normalized.includes("free t4") || normalized.includes("t4")) {
    return "Thyroid markers affect energy, metabolism, and recovery; interpret with your provider."
  }
  if (normalized.includes("esr")) {
    return "ESR is a nonspecific inflammation marker; context with symptoms and other labs matters."
  }
  if (normalized.includes("bun") || normalized.includes("creatinine") || normalized.includes("albumin")) {
    return "Kidney and liver markers help assess metabolic and organ function."
  }
  if (normalized.includes("ast") || normalized.includes("alt") || normalized.includes("bilirubin") || normalized.includes("alkaline")) {
    return "Liver enzymes reflect liver and sometimes muscle stress; discuss results with your provider."
  }
  if (normalized.includes("cortisol")) {
    return "Cortisol reflects stress, sleep, and recovery; lifestyle and context matter."
  }
  if (normalized.includes("shbg") || normalized.includes("estradiol")) {
    return "Hormone context helps interpret energy, body composition, and recovery."
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

  if (normalized.includes("serum iron") || normalized.includes("tibc") || normalized.includes("transferrin saturation")) {
    if (s === "deficient" || s === "suboptimal") {
      return "Iron studies support repletion; pair with ferritin and discuss dose with your provider."
    }
    if (s === "high") {
      return "Avoid iron supplementation; discuss with your provider."
    }
    return "Monitor with full iron panel on schedule."
  }

  if (normalized.includes("hemoglobin") || normalized.includes("hematocrit") || normalized.includes("rbc")) {
    if (s === "deficient" || s === "suboptimal") {
      return "Review with your provider; check ferritin and B12. Diet and possible supplementation per workup."
    }
    return "Maintain and retest as advised."
  }

  if (normalized.includes("vitamin d") || normalized.includes("vitd")) {
    return s === "deficient" || s === "suboptimal"
      ? "Use structured vitamin D support and recheck after a consistent intake period."
      : "Maintain intake and monitor."
  }

  if (normalized.includes("magnesium")) {
    return s === "deficient" || s === "suboptimal"
      ? "Improve daily intake and watch sleep, soreness, and muscle function."
      : "Maintain and monitor."
  }

  if (normalized.includes("crp") || normalized.includes("hscrp")) {
    return s === "high"
      ? "Review training stress, illness, sleep, and inflammation-support strategy."
      : "Watch the trend over time."
  }

  if (normalized.includes("b12") || normalized.includes("cobalamin")) {
    return s === "deficient" || s === "suboptimal"
      ? "Review intake and absorption context, then retest."
      : "Maintain and monitor."
  }

  if (normalized.includes("hba1c") || normalized.includes("glucose") || normalized.includes("fasting insulin") || normalized.includes("insulin")) {
    if (s === "high" || s === "suboptimal") {
      return "Lifestyle-first: diet, activity, sleep. Discuss with your provider before supplements."
    }
    return "Maintain healthy habits and retest on schedule."
  }

  if (normalized.includes("triglyceride") || normalized.includes("ldl") || normalized.includes("cholesterol") || normalized.includes("apob") || normalized.includes("lipoprotein")) {
    if (s === "high" || s === "suboptimal") {
      return "Diet, activity, and weight matter. Discuss targets and options with your provider."
    }
    return "Maintain and retest as advised."
  }

  if (normalized.includes("tsh") || normalized.includes("free t4") || normalized.includes("t4")) {
    return "Do not self-treat thyroid. Discuss results and next steps with your provider."
  }

  if (normalized.includes("esr")) {
    return s === "high" ? "Context with symptoms and other labs; discuss with your provider." : "Monitor as advised."
  }

  if (normalized.includes("bun") || normalized.includes("creatinine") || normalized.includes("albumin")) {
    return "Discuss with your provider; avoid self-treatment."
  }

  if (normalized.includes("ast") || normalized.includes("alt") || normalized.includes("bilirubin") || normalized.includes("alkaline")) {
    return "Discuss with your provider; avoid alcohol and unnecessary supplements until cleared."
  }

  if (normalized.includes("cortisol") || normalized.includes("shbg") || normalized.includes("estradiol")) {
    return "Interpret with your provider; focus on sleep, stress, and lifestyle first."
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
