/**
 * Positive, progress-oriented labels for priority cards (not “LOW X”).
 */

const JOURNEY_STEPS = [
  { step: "Step 1", theme: "Fix your foundation" },
  { step: "Step 2", theme: "Improve oxygen delivery" },
  { step: "Step 3", theme: "Support energy systems" },
  { step: "Step 4", theme: "Dial in recovery" },
  { step: "Step 5", theme: "Keep momentum" },
  { step: "Step 6", theme: "Stay consistent" },
] as const

export function getJourneyStepCopy(priorityIndex: number): { step: string; theme: string } {
  const i = Math.min(Math.max(priorityIndex - 1, 0), JOURNEY_STEPS.length - 1)
  return JOURNEY_STEPS[i]
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

/** e.g. “Boosting Vitamin D”, “Optimizing Ferritin” */
export function getProgressHeadlineForMarker(markerName: string, displayLabel: string): string {
  const m = norm(markerName)
  const d = norm(displayLabel)
  if (m.includes("vitamin d") || m.includes("25-oh") || d.includes("vitamin d")) {
    return "Boosting Vitamin D"
  }
  if (m.includes("ferritin") || d.includes("ferritin")) return "Optimizing Iron"
  if (m.includes("b12") || d.includes("b12")) return "Building B12"
  if (m.includes("iron") || d.includes("serum iron")) return "Optimizing Iron"
  if (m.includes("magnesium")) return "Optimizing Magnesium"
  if (m.includes("folate") || m.includes("folic")) return "Supporting Folate"
  if (m.includes("crp") || m.includes("inflammation")) return "Calming Inflammation"
  if (m.includes("glucose") || m.includes("hba1c")) return "Steadying Metabolism"
  if (m.includes("testosterone")) return "Balancing Testosterone"
  const short = displayLabel.replace(/^low\s+/i, "").replace(/^high\s+/i, "").trim() || markerName
  return `Optimizing ${short}`
}

/** Short supportive line under the headline */
export function getLifestyleTaglineForMarker(markerName: string): string {
  const m = norm(markerName)
  if (m.includes("vitamin d") || m.includes("25-oh")) return "More sunlight, better recovery"
  if (m.includes("ferritin") || m.includes("iron")) return "Stronger oxygen delivery, steadier energy"
  if (m.includes("b12")) return "Sharper focus, resilient nerves"
  if (m.includes("magnesium")) return "Sleep and stress support"
  if (m.includes("crp")) return "Less noise, faster bounce-back"
  return "Small shifts, compounding gains"
}

/**
 * Scene kind for action cards — maps to outcome photography + treatment in ActionCardBiomarkerScene.
 */
export type MarkerVisualKind =
  | "vitamin_d"
  | "iron_o2"
  | "b12"
  | "magnesium"
  | "folate"
  | "inflammation"
  | "metabolic"
  | "thyroid"
  | "lipids"
  | "liver"
  | "kidney"
  | "hormone"
  | "default"

export function getPositiveStatusTeaser(statusLower: string): string {
  if (statusLower === "deficient") return "We’ll bring this toward your target—one step at a time."
  if (statusLower === "high") return "We’ll guide this closer to your ideal range."
  return "Room to optimize vs your targets."
}

export function getMarkerVisualKind(markerName: string): MarkerVisualKind {
  const m = norm(markerName)

  if (m.includes("vitamin d") || m.includes("25-oh") || m.includes("25-hydroxy")) return "vitamin_d"

  if (
    m.includes("ferritin") ||
    m.includes("serum iron") ||
    m.includes("iron saturation") ||
    m.includes("tibc") ||
    m.includes("hemoglobin") ||
    m.includes("hgb") ||
    m.includes("rbc") ||
    m.includes("hematocrit") ||
    m.includes("mcv") ||
    m.includes("mch") ||
    m.includes("mchc")
  ) {
    return "iron_o2"
  }

  if (m.includes("b12") || m.includes("b-12") || m.includes("cobalamin")) return "b12"

  if (m.includes("magnesium")) return "magnesium"

  if (m.includes("folate") || m.includes("folic") || m.includes("b9")) return "folate"

  if (
    m.includes("crp") ||
    m.includes("hs-crp") ||
    m.includes("c-reactive") ||
    m.includes("esr") ||
    m.includes("sed rate") ||
    m.includes("homocysteine")
  ) {
    return "inflammation"
  }

  if (
    m.includes("glucose") ||
    m.includes("hba1c") ||
    m.includes("a1c") ||
    m.includes("insulin") ||
    m.includes("homa") ||
    m.includes("fasting insulin")
  ) {
    return "metabolic"
  }

  if (m.includes("tsh") || m.includes("t3") || m.includes("t4") || m.includes("thyroid") || m.includes("thyroxine")) {
    return "thyroid"
  }

  if (
    m.includes("cholesterol") ||
    m.includes("ldl") ||
    m.includes("hdl") ||
    m.includes("triglyceride") ||
    m.includes("apolipoprotein") ||
    m.includes("lipid")
  ) {
    return "lipids"
  }

  if (m.includes("alt") || m.includes("ast") || m.includes("ggt") || m.includes("alp") || m.includes("bilirubin") || m.includes("liver")) {
    return "liver"
  }

  if (
    m.includes("creatinine") ||
    m.includes("egfr") ||
    m.includes("gfr") ||
    m.includes("bun") ||
    m.includes("uric acid") ||
    m.includes("kidney")
  ) {
    return "kidney"
  }

  if (
    m.includes("testosterone") ||
    m.includes("estradiol") ||
    m.includes("progesterone") ||
    m.includes("cortisol") ||
    m.includes("dhea") ||
    m.includes("lh") ||
    m.includes("fsh") ||
    m.includes("prolactin") ||
    m.includes("shbg")
  ) {
    return "hormone"
  }

  return "default"
}
