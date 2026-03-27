/**
 * Clarion profile types and panel recommendations.
 * Profile types drive which biomarkers we recommend; panels are tailored, not one-size-fits-all.
 * Default recommended panel is the 10 core biomarkers (Ferritin, Vitamin D, B12, Folate, Mg, HbA1c, Glucose, LDL-C, TG, hs-CRP).
 */

import { CLARION_RECOMMENDED_PANEL_KEYS } from "@/src/lib/coreBiomarkerProtocols"

/** Core launch biomarker keys (flat list for panel recommendation). */
export const CORE_BIOMARKER_KEYS = [
  // CBC
  "Hemoglobin",
  "Hematocrit",
  "RBC",
  "MCV",
  "MCH",
  "RDW",
  "WBC",
  "Platelets",
  // CMP
  "Glucose",
  "Calcium",
  "Sodium",
  "Potassium",
  "Chloride",
  "CO2",
  "BUN",
  "Creatinine",
  "Albumin",
  "Total protein",
  "AST",
  "ALT",
  "Alkaline phosphatase",
  "Bilirubin",
  // Iron
  "Ferritin",
  "Serum iron",
  "TIBC",
  "Transferrin saturation",
  // Cardiometabolic
  "HbA1c",
  "Fasting insulin",
  "Triglycerides",
  "HDL-C",
  "LDL-C",
  "Total cholesterol",
  "ApoB",
  "Lipoprotein(a)",
  // Inflammation
  "hs-CRP",
  "ESR",
  // Vitamins / minerals
  "Vitamin D",
  "Vitamin B12",
  "Magnesium",
  // Thyroid
  "TSH",
  "Free T4",
  // Hormones (optional / profile-triggered)
  "Testosterone",
  "SHBG",
  "Free testosterone",
  "Estradiol",
  "Cortisol (AM)",
] as const

export type ProfileTypeId =
  // Universal
  | "general_health_adult"
  | "fatigue_low_energy"
  | "weight_loss_insulin_resistance"
  | "heart_health_longevity"
  | "vegetarian_vegan"
  // Performance
  | "endurance_athlete"
  | "strength_hypertrophy_athlete"
  | "mixed_sport_athlete"
  | "female_athlete"
  | "high_volume_adolescent"
  // Age / hormone
  | "young_adult_male"
  | "young_adult_female"
  | "perimenopause_menopause"
  | "male_hormone_bodycomp"
  | "older_adult_healthy_aging"
  // Clinical-pattern screens
  | "prediabetes_metabolic_risk"
  | "anemia_low_iron"
  | "thyroid_symptom_screen"
  | "high_inflammation_poor_recovery"
  | "sleep_stress_overreaching"

export type ProfileTypeGroup = "universal" | "performance" | "age_hormone" | "clinical"

export type ProfileTypeOption = {
  id: ProfileTypeId
  label: string
  shortLabel?: string
  description: string
  group: ProfileTypeGroup
}

/** Onboarding options: 10–12 profile types for core launch. */
export const PROFILE_TYPE_OPTIONS: ProfileTypeOption[] = [
  // Universal
  {
    id: "general_health_adult",
    label: "General health adult",
    description: "Routine screening and wellness",
    group: "universal",
  },
  {
    id: "fatigue_low_energy",
    label: "Fatigue / low energy",
    description: "Energy, iron, B12, thyroid context",
    group: "universal",
  },
  {
    id: "weight_loss_insulin_resistance",
    label: "Weight loss / insulin resistance",
    description: "Metabolic and glycemic markers",
    group: "universal",
  },
  {
    id: "heart_health_longevity",
    label: "Heart-health / longevity",
    description: "Lipids, ApoB, Lp(a), inflammation",
    group: "universal",
  },
  {
    id: "vegetarian_vegan",
    label: "Vegetarian / vegan",
    description: "Iron, B12, folate, vitamin D, zinc",
    group: "universal",
  },
  // Performance
  {
    id: "endurance_athlete",
    label: "Endurance athlete",
    description: "Iron, oxygen transport, recovery",
    group: "performance",
  },
  {
    id: "strength_hypertrophy_athlete",
    label: "Strength / hypertrophy athlete",
    description: "Vitamin D, magnesium, hormones",
    group: "performance",
  },
  {
    id: "mixed_sport_athlete",
    label: "Mixed sport / field sport athlete",
    description: "Balanced panel for multi-modal training",
    group: "performance",
  },
  {
    id: "female_athlete",
    label: "Female athlete / menstruating athlete",
    description: "Iron, B12, vitamin D, thyroid if needed",
    group: "performance",
  },
  {
    id: "high_volume_adolescent",
    label: "High-volume adolescent athlete",
    description: "Growth, iron, energy, recovery",
    group: "performance",
  },
  // Age / hormone
  {
    id: "older_adult_healthy_aging",
    label: "Older adult / healthy aging",
    description: "CBC, CMP, lipids, kidney, B12, vitamin D",
    group: "age_hormone",
  },
  // Clinical-pattern screens
  {
    id: "prediabetes_metabolic_risk",
    label: "Prediabetes / metabolic risk",
    description: "Glucose, HbA1c, insulin, lipids",
    group: "clinical",
  },
  {
    id: "anemia_low_iron",
    label: "Anemia / low iron symptoms",
    description: "CBC, ferritin, iron studies",
    group: "clinical",
  },
  {
    id: "thyroid_symptom_screen",
    label: "Thyroid symptom screen",
    description: "TSH, Free T4, plus context markers",
    group: "clinical",
  },
  {
    id: "high_inflammation_poor_recovery",
    label: "High inflammation / poor recovery",
    description: "hs-CRP, ESR, CBC, context",
    group: "clinical",
  },
  {
    id: "sleep_stress_overreaching",
    label: "Sleep / stress / overreaching",
    description: "Cortisol, recovery markers, context",
    group: "clinical",
  },
]

/** Panel recommendation: profile type → list of biomarker keys. General health uses the 10 core biomarkers. */
const PANELS_BY_PROFILE: Record<ProfileTypeId, string[]> = {
  general_health_adult: [...CLARION_RECOMMENDED_PANEL_KEYS],
  fatigue_low_energy: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "Ferritin",
    "Serum iron",
    "TIBC",
    "Transferrin saturation",
    "Vitamin B12",
    "Vitamin D",
    "TSH",
    "Free T4",
  ],
  weight_loss_insulin_resistance: [
    "Glucose",
    "HbA1c",
    "Fasting insulin",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
    "ApoB",
    "hs-CRP",
  ],
  heart_health_longevity: [
    "Triglycerides",
    "HDL-C",
    "LDL-C",
    "Total cholesterol",
    "ApoB",
    "Lipoprotein(a)",
    "HbA1c",
    "hs-CRP",
    "Glucose",
    "BUN",
    "Creatinine",
    "Hemoglobin",
    "Hematocrit",
    "RBC",
  ],
  vegetarian_vegan: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "Ferritin",
    "Serum iron",
    "TIBC",
    "Transferrin saturation",
    "Vitamin B12",
    "Vitamin D",
    "Magnesium",
  ],
  endurance_athlete: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "Ferritin",
    "Serum iron",
    "TIBC",
    "Transferrin saturation",
    "Vitamin D",
    "Vitamin B12",
    "Magnesium",
    "hs-CRP",
    "Glucose",
    "BUN",
    "Creatinine",
    "Albumin",
  ],
  strength_hypertrophy_athlete: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Vitamin D",
    "Magnesium",
    "hs-CRP",
    "Glucose",
    "BUN",
    "Creatinine",
    "Testosterone",
    "SHBG",
    "Estradiol",
  ],
  mixed_sport_athlete: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Ferritin",
    "Vitamin D",
    "Vitamin B12",
    "Magnesium",
    "hs-CRP",
    "Glucose",
    "BUN",
    "Creatinine",
  ],
  female_athlete: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "Ferritin",
    "Serum iron",
    "TIBC",
    "Transferrin saturation",
    "Vitamin D",
    "Vitamin B12",
    "Magnesium",
    "TSH",
    "Free T4",
  ],
  high_volume_adolescent: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Ferritin",
    "Vitamin D",
    "Vitamin B12",
    "Magnesium",
    "Glucose",
    "hs-CRP",
  ],
  young_adult_male: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Ferritin",
    "Vitamin D",
    "Vitamin B12",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
    "Testosterone",
    "SHBG",
  ],
  young_adult_female: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Ferritin",
    "Vitamin D",
    "Vitamin B12",
    "Magnesium",
    "TSH",
    "Free T4",
  ],
  perimenopause_menopause: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "Ferritin",
    "Vitamin D",
    "Vitamin B12",
    "TSH",
    "Free T4",
    "Estradiol",
    "Fasting insulin",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
  ],
  male_hormone_bodycomp: [
    "Testosterone",
    "SHBG",
    "Free testosterone",
    "Vitamin D",
    "Glucose",
    "HbA1c",
    "Fasting insulin",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
  ],
  older_adult_healthy_aging: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "Glucose",
    "BUN",
    "Creatinine",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
    "Total cholesterol",
    "HbA1c",
    "Vitamin B12",
    "Vitamin D",
    "TSH",
  ],
  prediabetes_metabolic_risk: [
    "Glucose",
    "HbA1c",
    "Fasting insulin",
    "Triglycerides",
    "HDL-C",
    "LDL-C",
    "ApoB",
    "hs-CRP",
  ],
  anemia_low_iron: [
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "MCV",
    "MCH",
    "RDW",
    "Ferritin",
    "Serum iron",
    "TIBC",
    "Transferrin saturation",
  ],
  thyroid_symptom_screen: [
    "TSH",
    "Free T4",
    "Hemoglobin",
    "RBC",
    "Vitamin D",
    "Vitamin B12",
  ],
  high_inflammation_poor_recovery: [
    "hs-CRP",
    "ESR",
    "Hemoglobin",
    "Hematocrit",
    "RBC",
    "WBC",
    "Ferritin",
    "Vitamin D",
  ],
  sleep_stress_overreaching: [
    "Cortisol (AM)",
    "Vitamin D",
    "Magnesium",
    "Ferritin",
    "Hemoglobin",
    "Glucose",
    "hs-CRP",
  ],
}

/**
 * Higher score = marker appears earlier in this profile's recommended panel → rank higher in Action Center.
 * Uses panel order from {@link PANELS_BY_PROFILE}; exact or substring match on resolved vs raw display name.
 */
export function getProfilePanelBoost(
  profileTypeId: string | null | undefined,
  resolvedMarkerKey: string,
  rawDisplayName?: string
): number {
  const id = (profileTypeId || "").trim() as ProfileTypeId
  const panel = PANELS_BY_PROFILE[id]
  if (!panel?.length) return 0
  const candidates = [resolvedMarkerKey, rawDisplayName ?? ""].map((s) => s.trim()).filter(Boolean)
  let bestIdx = -1
  for (const c of candidates) {
    const idx = panel.findIndex((k) => k === c || c.includes(k) || k.includes(c))
    if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx
  }
  if (bestIdx < 0) return 0
  return Math.max(0, 50 - bestIdx * 2)
}

/**
 * Onboarding health goal options (simple labels → profileType).
 */
export const HEALTH_GOAL_OPTIONS: { id: string; label: string; profileType: ProfileTypeId }[] = [
  { id: "more_energy", label: "More energy", profileType: "fatigue_low_energy" },
  { id: "improve_fitness", label: "Improve fitness", profileType: "mixed_sport_athlete" },
  { id: "longevity", label: "Longevity", profileType: "heart_health_longevity" },
  { id: "better_sleep", label: "Better sleep", profileType: "sleep_stress_overreaching" },
  { id: "improve_recovery", label: "Improve recovery", profileType: "high_inflammation_poor_recovery" },
  { id: "general_health", label: "General health", profileType: "general_health_adult" },
]

/**
 * Map onboarding health goal id to profile type for panel recommendation.
 */
export function healthGoalToProfileType(healthGoalId: string): ProfileTypeId {
  const opt = HEALTH_GOAL_OPTIONS.find((o) => o.id === healthGoalId)
  return opt?.profileType ?? "general_health_adult"
}

/**
 * Returns recommended biomarker keys for a profile type.
 * Filters to only keys that exist in the provided allKeys (so we don't recommend markers we don't have in DB yet).
 */
export function getRecommendedPanelForProfile(
  profileTypeId: ProfileTypeId | string,
  allKeys: string[]
): string[] {
  const requested = PANELS_BY_PROFILE[profileTypeId as ProfileTypeId] ?? []
  const keySet = new Set(allKeys.map((k) => k.trim()))
  return requested.filter((k) => keySet.has(k))
}

/**
 * Map legacy goal/sport to a profile type for backward compatibility.
 */
export function legacyGoalSportToProfileType(goal: string, sport: string): ProfileTypeId {
  const g = (goal || "").toLowerCase()
  const s = (sport || "").toLowerCase()
  if (s.includes("endurance") || s.includes("elite") || s.includes("runner") || s.includes("cycl")) return "endurance_athlete"
  if (s.includes("strength") || s.includes("hypertrophy") || s.includes("lift")) return "strength_hypertrophy_athlete"
  if (s.includes("hybrid") || s.includes("mixed") || s.includes("train regularly")) return "mixed_sport_athlete"
  if (s.includes("sedentary")) {
    if (g.includes("weight") || g.includes("insulin") || g.includes("energy")) return "weight_loss_insulin_resistance"
    return "general_health_adult"
  }
  if (g.includes("performance") || g.includes("recovery")) return "endurance_athlete"
  if (g.includes("energy") || g.includes("fatigue")) return "fatigue_low_energy"
  if (g.includes("longevity") || g.includes("wellness") || g.includes("heart")) return "heart_health_longevity"
  if (g.includes("general")) return "general_health_adult"
  return "general_health_adult"
}
