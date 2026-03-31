/**
 * Fallback next-step copy and type for every biomarker so flagged markers
 * always have a defined "next action" (supplement, diet, lifestyle, or clinician).
 * Used by Biomarkers page, Actions, and insight views.
 */

export type NextStepType = "supplement" | "diet" | "lifestyle" | "clinician"

export type BiomarkerNextStep = {
  nextStepType: NextStepType
  nextStepCopy: string
}

/** Normalize marker name for lookup (e.g. "25-OH Vitamin D" -> "Vitamin D"). */
function normalizeKey(name: string): string {
  const n = name.trim()
  if (n === "25-OH Vitamin D") return "Vitamin D"
  if (n === "Fasting Glucose") return "Glucose"
  return n
}

/**
 * Fallback next steps when we need a guaranteed one-liner per marker.
 * Covers all keys in biomarkerDatabase; supplementNotes in the DB may still be used for full copy.
 */
const FALLBACK_NEXT_STEPS: Record<string, BiomarkerNextStep> = {
  Ferritin: {
    nextStepType: "supplement",
    nextStepCopy: "Consider iron supplementation and vitamin C; avoid coffee/tea near iron. Retest in 8–12 weeks. Discuss dose with your clinician.",
  },
  "Vitamin D": {
    nextStepType: "supplement",
    nextStepCopy: "Consider vitamin D3 and dietary sources (fatty fish, egg yolks). Retest in 8–12 weeks.",
  },
  Magnesium: {
    nextStepType: "supplement",
    nextStepCopy: "Consider magnesium (e.g. glycinate) and magnesium-rich foods. Retest in 8–12 weeks.",
  },
  "Vitamin B12": {
    nextStepType: "supplement",
    nextStepCopy: "Consider B12 supplementation; review diet and any PPI/metformin use with your clinician. Retest in 8–12 weeks.",
  },
  Folate: {
    nextStepType: "supplement",
    nextStepCopy: "Consider folate or methylfolate; ensure adequate B12. Discuss with your clinician. Retest in 8–12 weeks.",
  },
  CRP: {
    nextStepType: "lifestyle",
    nextStepCopy: "Focus on recovery, sleep, and anti-inflammatory diet. Omega-3s may help; discuss with your clinician.",
  },
  Glucose: {
    nextStepType: "diet",
    nextStepCopy: "Diet and activity first: more fiber, protein, fewer refined carbs. Retest in 8–12 weeks.",
  },
  Insulin: {
    nextStepType: "lifestyle",
    nextStepCopy: "Lifestyle-first: diet, activity, sleep. Retest in 6–12 weeks. Discuss with your clinician if elevated.",
  },
  Testosterone: {
    nextStepType: "lifestyle",
    nextStepCopy: "Evaluate sleep, stress, calories, and training load before any supplementation. Discuss with your clinician.",
  },
  Hemoglobin: {
    nextStepType: "clinician",
    nextStepCopy: "Discuss with your doctor; focus on diet and cause. Do not self-treat with iron without workup.",
  },
  Hematocrit: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up for abnormal values. Do not self-treat.",
  },
  RBC: {
    nextStepType: "clinician",
    nextStepCopy: "Discuss with your doctor; focus on cause (iron, B12, folate).",
  },
  MCV: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up; do not self-treat. Context with B12 and ferritin.",
  },
  "Serum iron": {
    nextStepType: "supplement",
    nextStepCopy: "Interpret with ferritin and TIBC. Iron supplementation only if supported by full panel. Retest in 8–12 weeks.",
  },
  TIBC: {
    nextStepType: "clinician",
    nextStepCopy: "Interpret with ferritin and serum iron; medical guidance for treatment.",
  },
  "Transferrin saturation": {
    nextStepType: "clinician",
    nextStepCopy: "Do not add iron if saturation is already high. Discuss with your provider.",
  },
  HbA1c: {
    nextStepType: "lifestyle",
    nextStepCopy: "Lifestyle-first: diet, activity, weight if needed. Discuss berberine or other interventions with your provider.",
  },
  "Fasting insulin": {
    nextStepType: "lifestyle",
    nextStepCopy: "Lifestyle-first; medical guidance for any interventions. Retest in 6–12 weeks.",
  },
  Triglycerides: {
    nextStepType: "diet",
    nextStepCopy: "Diet and lifestyle: reduce alcohol, improve carb quality, omega-3 from food or supplement. Discuss dose with provider.",
  },
  "HDL-C": {
    nextStepType: "lifestyle",
    nextStepCopy:
      "Lifestyle first (activity, smoking cessation, diet pattern). Interpret HDL with LDL, triglycerides, and overall risk—medications to raise HDL are not a substitute for panel-based prevention.",
  },
  "LDL-C": {
    nextStepType: "diet",
    nextStepCopy: "Diet and lifestyle; psyllium or plant sterols may help. Discuss with provider; no self-directed statin.",
  },
  "Total cholesterol": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up for treatment decisions. Context with HDL and LDL.",
  },
  ApoB: {
    nextStepType: "clinician",
    nextStepCopy: "Discuss with your provider. Same lifestyle approaches as full lipid panel.",
  },
  "Lipoprotein(a)": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up; do not self-treat. Often genetically influenced.",
  },
  "hs-CRP": {
    nextStepType: "lifestyle",
    nextStepCopy: "Lifestyle and recovery; curcumin or omega-3 may help. Discuss with provider if on anticoagulants.",
  },
  ESR: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up; do not self-treat. Context: illness, recovery.",
  },
  TSH: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-treat thyroid with supplements. Medical follow-up.",
  },
  "Free T4": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up only; do not self-treat. Interpret with TSH.",
  },
  BUN: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up for abnormal values. Hydration and context.",
  },
  Creatinine: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-treat; medical follow-up. Hydration context.",
  },
  Albumin: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Adequate protein if low.",
  },
  SHBG: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-treat hormones; discuss with provider. Interpret with testosterone.",
  },
  "Free testosterone": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up; do not self-treat with hormones.",
  },
  Estradiol: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-treat; medical follow-up.",
  },
  "Cortisol (AM)": {
    nextStepType: "lifestyle",
    nextStepCopy: "Focus on sleep and stress management. Retest as advised.",
  },
  MCH: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Interpret with hemoglobin, MCV, ferritin.",
  },
  RDW: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Elevated in some anemias (e.g. iron deficiency).",
  },
  WBC: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up for abnormal values. Infection or inflammation context.",
  },
  Platelets: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up for abnormal values.",
  },
  Calcium: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Interpret with albumin and vitamin D.",
  },
  Sodium: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Hydration context.",
  },
  Potassium: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-supplement; medical follow-up. Heart and muscle function.",
  },
  Chloride: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Interpret with sodium and CO2.",
  },
  CO2: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Acid-base and kidney context.",
  },
  "Total protein": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Adequate protein if low.",
  },
  AST: {
    nextStepType: "clinician",
    nextStepCopy: "Do not self-treat; medical follow-up. Liver or muscle context.",
  },
  ALT: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Liver health; interpret with AST.",
  },
  "Alkaline phosphatase": {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Bone or liver context.",
  },
  Bilirubin: {
    nextStepType: "clinician",
    nextStepCopy: "Medical follow-up. Liver function context.",
  },
}

/**
 * Return the defined next step for a biomarker (type + one-line copy).
 * Uses fallback map; normalizes "25-OH Vitamin D" and "Fasting Glucose".
 */
export function getNextStepForMarker(markerName: string): BiomarkerNextStep {
  const key = normalizeKey(markerName)
  return FALLBACK_NEXT_STEPS[key] ?? {
    nextStepType: "clinician",
    nextStepCopy: "Discuss with your clinician for next steps and retest timing.",
  }
}
