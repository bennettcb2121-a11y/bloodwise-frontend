/**
 * Retest timing recommendations per biomarker, with explanations.
 */

export type BiomarkerResult = {
  name?: string
  marker?: string
  status?: string
  [key: string]: unknown
}

export type RetestRecommendation = {
  marker: string
  timing: string
  explanation: string
}

function normalizeName(name?: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
}

const RETEST_RULES: Array<{
  match: (name: string) => boolean
  timing: string
  explanation: string
}> = [
  {
    match: (n) => n.includes("ferritin"),
    timing: "8–10 weeks",
    explanation:
      "Iron stores change relatively slowly. Retesting in 8–10 weeks allows time to see a meaningful shift after supplementation or diet changes, and helps avoid over-correction.",
  },
  {
    match: (n) => n.includes("vitamind") || n.includes("vitd") || (n.includes("vitamin") && n.includes("d")),
    timing: "8–12 weeks",
    explanation:
      "Vitamin D levels respond over several weeks to consistent intake. An 8–12 week window captures the effect of supplementation or sun exposure and guides dose adjustment.",
  },
  {
    match: (n) => n.includes("crp") || n.includes("creactive"),
    timing: "4–6 weeks",
    explanation:
      "CRP can change quickly with recovery, illness resolution, or lifestyle changes. A 4–6 week retest helps confirm whether inflammation has improved or if further action is needed.",
  },
  {
    match: (n) => n.includes("magnesium"),
    timing: "6–8 weeks",
    explanation:
      "Magnesium status reflects recent intake and absorption. Retesting in 6–8 weeks shows whether diet or supplementation is moving levels toward the optimal range.",
  },
  {
    match: (n) => n.includes("b12") || n.includes("cobalamin") || (n.includes("vitamin") && n.includes("b12")),
    timing: "8–12 weeks",
    explanation:
      "B12 and related markers (e.g. MMA) respond over weeks to supplementation or diet. An 8–12 week retest confirms repletion and helps assess absorption if levels stay low.",
  },
  {
    match: (n) => n.includes("testosterone"),
    timing: "8–12 weeks",
    explanation:
      "Testosterone can fluctuate with sleep, stress, and training. Retesting in 8–12 weeks gives a more stable picture and avoids over-interpreting a single low result.",
  },
  {
    match: (n) => n.includes("glucose") || n.includes("insulin"),
    timing: "8–12 weeks",
    explanation:
      "Metabolic markers often shift with sustained diet and activity changes. An 8–12 week retest reflects habit changes rather than short-term variation.",
  },
]

const DEFAULT_TIMING = "8–12 weeks"
const DEFAULT_EXPLANATION =
  "Retesting in 8–12 weeks allows time for interventions to take effect and provides a clearer trend than retesting too soon."

/**
 * Returns retest timing and explanation for each biomarker in the analysis results.
 */
export function getRetestRecommendations(
  analysisResults: BiomarkerResult[] = []
): RetestRecommendation[] {
  if (!Array.isArray(analysisResults) || analysisResults.length === 0) {
    return []
  }

  return analysisResults.map((item) => {
    const name = String(item.name || item.marker || "").trim()
    const normalized = normalizeName(name)

    const rule = RETEST_RULES.find((r) => r.match(normalized))
    const timing = rule?.timing ?? DEFAULT_TIMING
    const explanation = rule?.explanation ?? DEFAULT_EXPLANATION

    return {
      marker: name || "Biomarker",
      timing,
      explanation,
    }
  })
}
