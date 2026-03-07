/**
 * Biomarker pattern detection: identifies common multi-marker patterns
 * and returns titles, explanations, and recommended focus actions.
 */

export type BiomarkerResult = {
  name?: string
  marker?: string
  status?: string
  value?: number
  [key: string]: unknown
}

export type DetectedPattern = {
  title: string
  explanation: string
  focusActions: string[]
  significance: "high" | "moderate" | "low"
  markers: string[]
}

function normalizeName(name?: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
}

function getMarker(report: BiomarkerResult[], markerName: string) {
  const normalized = normalizeName(markerName)
  return report.find(
    (item) =>
      normalizeName(item.name || item.marker || "") === normalized ||
      normalizeName(String(item.name || "")) === normalized
  )
}

function isLow(status?: string) {
  const s = String(status || "").toLowerCase()
  return s === "deficient" || s === "suboptimal" || s === "low"
}

function isHigh(status?: string) {
  return String(status || "").toLowerCase() === "high"
}

function countLowNutrients(report: BiomarkerResult[], markerNames: string[]): number {
  return markerNames.filter((name) => {
    const m = getMarker(report, name)
    return m && isLow(m.status)
  }).length
}

/**
 * Detect biomarker patterns from analysis results.
 * Returns patterns with title, explanation, and recommended focus actions.
 */
export function detectPatterns(report: BiomarkerResult[] = []): DetectedPattern[] {
  if (!Array.isArray(report) || report.length === 0) return []

  const patterns: DetectedPattern[] = []

  const ferritin = getMarker(report, "Ferritin")
  const vitaminD = getMarker(report, "Vitamin D")
  const b12 = getMarker(report, "Vitamin B12")
  const magnesium = getMarker(report, "Magnesium")
  const crp = getMarker(report, "CRP")
  const insulin = getMarker(report, "Insulin")
  const glucose = getMarker(report, "Glucose")
  const testosterone = getMarker(report, "Testosterone")

  // Endurance fatigue: low ferritin + low vitamin D + elevated CRP
  if (
    ferritin &&
    vitaminD &&
    crp &&
    isLow(ferritin.status) &&
    isLow(vitaminD.status) &&
    isHigh(crp.status)
  ) {
    patterns.push({
      title: "Endurance fatigue pattern",
      explanation:
        "Low ferritin, low vitamin D, and elevated CRP together often point to endurance fatigue: reduced oxygen delivery from low iron stores, slower recovery and immune support from low vitamin D, and inflammation from training or stress. This combination can drag energy, recovery, and performance.",
      focusActions: [
        "Prioritize iron repletion with follow-up bloodwork; avoid high-dose iron without monitoring.",
        "Address vitamin D with structured supplementation and retest after 8–12 weeks.",
        "Support recovery and lower inflammation: sleep, nutrition, and training load management.",
        "Retest ferritin, vitamin D, and CRP in 8–12 weeks to confirm improvement.",
      ],
      significance: "high",
      markers: ["Ferritin", "Vitamin D", "CRP"],
    })
  }

  // Inflammation: CRP elevated
  if (crp && isHigh(crp.status)) {
    const alreadyInEndurance = patterns.some((p) => p.title === "Endurance fatigue pattern")
    if (!alreadyInEndurance) {
      patterns.push({
        title: "Inflammation pattern",
        explanation:
          "CRP is elevated, indicating increased systemic inflammation. This can stem from training stress, illness, poor recovery, diet, or other factors. Managing inflammation supports recovery, adaptation, and long-term health.",
        focusActions: [
          "Review training load, sleep, and recovery; consider deload or recovery focus.",
          "Optimize anti-inflammatory nutrition (omega-3s, whole foods, reduce processed foods).",
          "Rule out acute illness or infection; retest CRP after recovery if needed.",
          "Recheck CRP in 4–8 weeks to see if levels normalize with intervention.",
        ],
        significance: "high",
        markers: ["CRP"],
      })
    }
  }

  // Micronutrient depletion: multiple low nutrients
  const nutrientMarkers = ["Ferritin", "Vitamin D", "Vitamin B12", "Magnesium"]
  const lowCount = countLowNutrients(report, nutrientMarkers)
  if (lowCount >= 2) {
    const lowMarkers = nutrientMarkers.filter((name) => {
      const m = getMarker(report, name)
      return m && isLow(m.status)
    })
    patterns.push({
      title: "Micronutrient depletion pattern",
      explanation: `Multiple nutrients are below ideal (${lowMarkers.join(", ")}). This can affect energy, recovery, immunity, and performance. Addressing deficiencies together—with diet and targeted supplementation where appropriate—often yields better results than fixing one in isolation.`,
      focusActions: [
        "Focus on nutrient-dense whole foods; consider working with a dietitian if several values are low.",
        "Address the lowest or most impactful markers first (e.g. iron if ferritin is deficient).",
        "Avoid stacking high-dose supplements without a plan; retest to avoid over-correction.",
        "Retest in 8–12 weeks to confirm repletion and adjust intake as needed.",
      ],
      significance: lowCount >= 3 ? "high" : "moderate",
      markers: lowMarkers,
    })
  }

  // Iron and B12 support pattern (existing)
  if (ferritin && b12 && isLow(ferritin.status) && isLow(b12.status)) {
    const alreadyInMicronutrient = patterns.some((p) => p.title === "Micronutrient depletion pattern")
    if (!alreadyInMicronutrient) {
      patterns.push({
        title: "Iron and B12 support pattern",
        explanation:
          "Ferritin and vitamin B12 are both below ideal. This can point toward reduced red blood cell support, lower energy availability, and impaired endurance or recovery capacity.",
        focusActions: [
          "Prioritize iron and B12 repletion with diet and/or supplementation; consider absorption (e.g. B12 form, taking iron apart from calcium/tea).",
          "Retest ferritin and B12 in 8–12 weeks to confirm improvement.",
        ],
        significance: "high",
        markers: ["Ferritin", "Vitamin B12"],
      })
    }
  }

  // Recovery support pattern: vitamin D + magnesium low (existing)
  if (vitaminD && magnesium && isLow(vitaminD.status) && isLow(magnesium.status)) {
    const alreadyInMicronutrient = patterns.some((p) => p.title === "Micronutrient depletion pattern")
    if (!alreadyInMicronutrient) {
      patterns.push({
        title: "Recovery support pattern",
        explanation:
          "Vitamin D and magnesium are both below ideal. This combination may affect muscle function, sleep quality, recovery, immune resilience, and training adaptation.",
        focusActions: [
          "Support vitamin D and magnesium through diet and supplementation; ensure consistent intake.",
          "Retest in 8–12 weeks to confirm levels move toward optimal range.",
        ],
        significance: "moderate",
        markers: ["Vitamin D", "Magnesium"],
      })
    }
  }

  // Inflammation and metabolic stress (CRP + insulin)
  if (crp && insulin && isHigh(crp.status) && isHigh(insulin.status)) {
    const alreadyInflammation = patterns.some((p) => p.title === "Inflammation pattern")
    if (!alreadyInflammation) {
      patterns.push({
        title: "Inflammation and metabolic stress pattern",
        explanation:
          "CRP and insulin are both elevated. This can reflect poor recovery, higher systemic stress, reduced metabolic flexibility, or an unfavorable overall health pattern.",
        focusActions: [
          "Address inflammation and metabolic health: sleep, stress, nutrition, and activity.",
          "Consider retesting CRP and insulin after 8–12 weeks of consistent intervention.",
        ],
        significance: "high",
        markers: ["CRP", "Insulin"],
      })
    }
  }

  // Reduced insulin sensitivity (glucose + insulin)
  if (glucose && insulin && isHigh(glucose.status) && isHigh(insulin.status)) {
    patterns.push({
      title: "Reduced insulin sensitivity pattern",
      explanation:
        "Glucose and insulin are elevated together, which may suggest reduced insulin sensitivity or impaired metabolic efficiency.",
      focusActions: [
        "Focus on diet quality, activity, and sleep; consider working with a clinician for metabolic support.",
        "Retest glucose and insulin after lifestyle changes to track improvement.",
      ],
      significance: "high",
      markers: ["Glucose", "Insulin"],
    })
  }

  // Recovery and endocrine strain (low testosterone + high CRP)
  if (testosterone && crp && isLow(testosterone.status) && isHigh(crp.status)) {
    patterns.push({
      title: "Recovery and endocrine strain pattern",
      explanation:
        "Low testosterone paired with elevated CRP may reflect poor recovery, energy deficiency, excessive training stress, or broader endocrine strain.",
      focusActions: [
        "Prioritize recovery, sleep, and stress management; avoid overtraining.",
        "Discuss with a clinician before any hormone-related intervention; retest in 8–12 weeks.",
      ],
      significance: "high",
      markers: ["Testosterone", "CRP"],
    })
  }

  return patterns
}
