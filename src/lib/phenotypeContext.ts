/**
 * Assembles a small, flat, privacy-safe "phenotype" object from what we already know about
 * the user. This is the single input to phenotypeRules.ts and biomarkerPersonalInterpret.ts,
 * so interpretations stay consistent across the app.
 *
 * We never include identifiers (name, email, DOB, address) — only coarse traits that modify
 * biomarker interpretation and supplement fit.
 */

import type { ProfileRow } from "@/src/lib/bloodwiseDb"

export type Phenotype = {
  ageBand: "under_25" | "25_34" | "35_44" | "45_54" | "55_64" | "65_plus" | "unknown"
  sex: "male" | "female" | "unknown"
  trainingFocus: string // e.g. endurance_athlete, strength, female_athlete, mixed_sport, sedentary, none
  healthGoalIds: string[] // e.g. ["more_energy","improve_fitness"]
  symptomIds: string[]
  dietPreference: string // omnivore | vegetarian | vegan | pescatarian | other
  alcoholFrequency: string // no | occasionally | regularly | unknown
  activityLevel: string // sedentary | light | moderate | very_active | unknown
  sleepHoursBand: string // under_6 | 6_7 | 7_8 | 8_plus | unknown
  supplementFormPreference: "any" | "no_pills"
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  planTier: "none" | "lite" | "full"
  /** Self-reported conditions / contraindications surfaced via onboarding symptom list. */
  flags: {
    kidneyDisease: boolean
    pregnancy: boolean
    anticoagulant: boolean
    thyroidMedication: boolean
    menopauseStatus: "pre" | "peri" | "post" | "unknown"
    /** Statin use — changes CoQ10 and lipid interpretation. */
    onStatin: boolean
  }
}

function parseAgeBand(age: string | null | undefined): Phenotype["ageBand"] {
  const n = parseInt(String(age ?? ""), 10)
  if (!Number.isFinite(n) || n <= 0) return "unknown"
  if (n < 25) return "under_25"
  if (n < 35) return "25_34"
  if (n < 45) return "35_44"
  if (n < 55) return "45_54"
  if (n < 65) return "55_64"
  return "65_plus"
}

function normalizeSex(sex: string | null | undefined): Phenotype["sex"] {
  const s = String(sex ?? "").toLowerCase().trim()
  if (s.startsWith("m")) return "male"
  if (s.startsWith("f")) return "female"
  return "unknown"
}

function parseCsvIds(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function deriveBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null
  const m = heightCm / 100
  const bmi = weightKg / (m * m)
  if (!Number.isFinite(bmi)) return null
  return Math.round(bmi * 10) / 10
}

/** Build a phenotype from a profile row (client or server). */
export function buildPhenotype(profile: Partial<ProfileRow> | null | undefined): Phenotype {
  const p = profile ?? {}
  const symptoms = parseCsvIds(p.symptoms ?? "")
  const height = typeof p.height_cm === "number" ? p.height_cm : null
  const weight = typeof p.weight_kg === "number" ? p.weight_kg : null
  const bmi = deriveBmi(height, weight)

  const flags = {
    kidneyDisease: symptoms.includes("kidney_disease") || symptoms.includes("ckd"),
    pregnancy: symptoms.includes("pregnancy") || symptoms.includes("pregnant"),
    anticoagulant: symptoms.includes("anticoagulant") || symptoms.includes("on_blood_thinners"),
    thyroidMedication: symptoms.includes("thyroid_medication") || symptoms.includes("levothyroxine"),
    menopauseStatus: menopauseFromSymptoms(symptoms),
    onStatin: symptoms.includes("on_statin") || symptoms.includes("statin"),
  }

  return {
    ageBand: parseAgeBand(p.age),
    sex: normalizeSex(p.sex),
    trainingFocus: String(p.training_focus ?? "").trim(),
    healthGoalIds: parseCsvIds(p.health_goals ?? ""),
    symptomIds: symptoms,
    dietPreference: String(p.diet_preference ?? "").trim().toLowerCase() || "omnivore",
    alcoholFrequency: String(p.alcohol_frequency ?? "").trim().toLowerCase() || "unknown",
    activityLevel: String(p.activity_level ?? "").trim().toLowerCase() || "unknown",
    sleepHoursBand: String(p.sleep_hours_band ?? "").trim().toLowerCase() || "unknown",
    supplementFormPreference: (p.supplement_form_preference === "no_pills"
      ? "no_pills"
      : "any") as Phenotype["supplementFormPreference"],
    heightCm: height,
    weightKg: weight,
    bmi,
    planTier: (p.plan_tier as Phenotype["planTier"]) || "none",
    flags,
  }
}

function menopauseFromSymptoms(symptoms: string[]): "pre" | "peri" | "post" | "unknown" {
  if (symptoms.includes("post_menopause") || symptoms.includes("postmenopausal")) return "post"
  if (symptoms.includes("peri_menopause") || symptoms.includes("perimenopausal")) return "peri"
  if (symptoms.includes("pre_menopause") || symptoms.includes("premenopausal")) return "pre"
  return "unknown"
}

/** One-line human-readable summary of phenotype for UI and prompts. */
export function phenotypeSummary(p: Phenotype): string {
  const parts: string[] = []
  if (p.ageBand !== "unknown") parts.push(p.ageBand.replace("_", "–"))
  if (p.sex !== "unknown") parts.push(p.sex)
  if (p.trainingFocus) parts.push(p.trainingFocus.replace(/_/g, " "))
  if (p.healthGoalIds.length) parts.push(`goals: ${p.healthGoalIds.join(", ")}`)
  if (p.dietPreference && p.dietPreference !== "omnivore") parts.push(p.dietPreference)
  return parts.join(" · ")
}
