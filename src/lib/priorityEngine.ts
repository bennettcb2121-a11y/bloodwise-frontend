/**
 * Priority and focus: status tone, top-focus list, why-it-matters and next-step copy.
 */

import { getLipidPanelCoachingNote } from "@/src/lib/lipidPanelContext"

function compactMarkerKey(marker: string): string {
  return marker
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
}

export type StatusTone = {
  label: string
  className: string
  icon: string
}

export type PrioritySummary = {
  biggestDrag: string
  strongestMarker: string
  nextBestAction: string
  /** Education-only line when lipid markers are flagged; emphasizes full panel + clinician. */
  lipidPanelNote: string | null
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

/**
 * Softer labels for dashboard home (companion tone — not clinical).
 * Keeps same `className` for styling; only `label` changes.
 */
export function getStatusToneFriendly(status?: string): StatusTone {
  const base = getStatusTone(status)
  const s = (status || "").toLowerCase()
  if (s === "optimal" || s === "normal" || s === "in range") {
    return { ...base, label: "In range" }
  }
  if (s === "suboptimal" || s === "borderline") {
    return { ...base, label: "Building" }
  }
  if (s === "deficient") {
    return { ...base, label: "Low" }
  }
  if (s === "high") {
    return { ...base, label: "Elevated" }
  }
  return base
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
  const compact = compactMarkerKey(marker)

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
  if (compact.includes("nonhdl")) {
    return "Non-HDL cholesterol captures several atherogenic particles; it’s usually interpreted with LDL and triglycerides as a panel, not alone."
  }
  if (compact.includes("hdl") && !compact.includes("nonhdl")) {
    return "HDL is one part of your lipid picture; cardiovascular risk is judged using the full panel (including LDL and triglycerides) and your history."
  }
  if (
    normalized.includes("triglyceride") ||
    normalized.includes("ldl") ||
    normalized.includes("cholesterol") ||
    normalized.includes("apob") ||
    normalized.includes("lipoprotein")
  ) {
    return "Lipids and ApoB influence cardiovascular risk; interpret as a panel with your clinician."
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
    return "Cortisol reflects stress, sleep, and recovery; a single AM value is easy to misinterpret without clinical context."
  }
  if (normalized.includes("shbg") || normalized.includes("estradiol")) {
    return "Sex-hormone markers are highly context-dependent (sex, age, cycle, medications); interpret with your clinician."
  }
  if (normalized.includes("folate") || compact.includes("folic")) {
    return "Folate supports DNA synthesis and red blood cells; always interpret alongside B12—high folate can mask B12 deficiency."
  }
  if (normalized.includes("mcv") || normalized.includes("mch") || normalized.includes("rdw")) {
    return "Red cell indices help classify anemia; interpret with hemoglobin, ferritin, B12, and folate as a pattern."
  }
  if (normalized.includes("wbc") || normalized.includes("platelet")) {
    return "White cells and platelets reflect infection, inflammation, and marrow function—interpret with symptoms and the full CBC."
  }
  if (
    normalized.includes("potassium") ||
    normalized.includes("sodium") ||
    normalized.includes("chloride") ||
    normalized.includes("co2") ||
    normalized.includes("bicarbonate")
  ) {
    return "Electrolytes affect heart, muscle, and fluid balance; abnormal values need prompt clinician interpretation."
  }
  if (normalized.includes("calcium")) {
    return "Calcium is interpreted with albumin, vitamin D, and PTH; do not self-supplement without medical guidance."
  }
  if (normalized.includes("alkaline phosphatase")) {
    return "ALP can rise from liver or bone sources; your clinician interprets it with the rest of the panel."
  }
  if (normalized.includes("total protein")) {
    return "Total protein reflects nutrition, inflammation, and liver synthetic function—interpret with albumin."
  }
  if (normalized.includes("bilirubin")) {
    return "Bilirubin changes can reflect liver or blood-cell turnover; needs clinical context, not guesswork."
  }

  return "This marker should be interpreted with the rest of your panel, your history, and your clinician."
}

export function inferNextStep(marker: string, status?: string): string {
  const normalized = marker.toLowerCase()
  const compact = compactMarkerKey(marker)
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

  if (compact.includes("nonhdl")) {
    if (s === "high" || s === "suboptimal") {
      return "Non-HDL is read with LDL and triglycerides. Lifestyle first (diet, activity, weight); discuss goals with your clinician."
    }
    return "Discuss with your clinician in context of your full lipid panel."
  }

  if (compact.includes("hdl") && !compact.includes("nonhdl")) {
    if (s === "deficient" || s === "low" || s === "suboptimal") {
      return "Low HDL is usually interpreted with LDL and triglycerides—not alone. Activity, smoking cessation, and diet pattern matter; ask your clinician about your overall risk."
    }
    if (s === "high") {
      return "Very high HDL is uncommon; confirm interpretation with your clinician alongside the rest of your lipid panel."
    }
    return "Keep HDL in context with LDL, triglycerides, and overall risk—your clinician can help prioritize next steps."
  }

  if (normalized.includes("triglyceride") || normalized.includes("ldl") || normalized.includes("cholesterol") || normalized.includes("apob") || normalized.includes("lipoprotein")) {
    if (s === "high" || s === "suboptimal") {
      return "Diet, activity, and weight matter. Discuss how this marker fits with your full lipid panel and overall risk with your clinician."
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

  if (normalized.includes("folate") || compact.includes("folic")) {
    if (s === "deficient" || s === "low" || s === "suboptimal") {
      return "Address diet and confirm B12 status; high-dose folic acid without B12 evaluation can mask deficiency—ask your clinician."
    }
    return "Maintain balanced intake and monitor with your provider."
  }

  if (normalized.includes("mcv") || normalized.includes("mch") || normalized.includes("rdw")) {
    return "Do not self-treat by index alone; your clinician ties MCV/RDW to iron, B12, folate, and symptoms."
  }

  if (normalized.includes("wbc") || normalized.includes("platelet")) {
    return "Abnormal counts can be benign or serious—discuss promptly with your clinician, especially if new symptoms."
  }

  if (
    normalized.includes("potassium") ||
    normalized.includes("sodium") ||
    normalized.includes("chloride") ||
    normalized.includes("co2") ||
    normalized.includes("bicarbonate")
  ) {
    return "Electrolyte problems can be urgent—seek clinician guidance; do not self-adjust salt or potassium supplements."
  }

  if (normalized.includes("calcium")) {
    return "Discuss with your clinician; avoid calcium or vitamin D megadoses without monitoring."
  }

  if (normalized.includes("alkaline phosphatase") || normalized.includes("bilirubin") || normalized.includes("total protein")) {
    return "Discuss with your clinician; avoid alcohol and new supplements until the pattern is explained."
  }

  return "Review with your clinician in the context of your full lab panel and health history."
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

  const lipidPanelNote = getLipidPanelCoachingNote(analysisResults)

  return { biggestDrag, strongestMarker, nextBestAction, lipidPanelNote }
}
