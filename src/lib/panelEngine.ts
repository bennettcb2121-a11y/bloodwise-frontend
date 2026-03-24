/**
 * Panel and biomarker selection: keys, recommended markers by profile, reasons, placeholders, entered data.
 */

import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import {
  getRecommendedPanelForProfile,
  legacyGoalSportToProfileType,
  healthGoalToProfileType,
  CORE_BIOMARKER_KEYS,
} from "@/src/lib/clarionProfiles"
import { CLARION_RECOMMENDED_PANEL_KEYS } from "@/src/lib/coreBiomarkerProtocols"
import { getHealthContext } from "@/src/lib/healthContext"

export type ProfileState = {
  age: string
  sex: string
  sport: string
  goal: string
  /** How user prefers to improve biomarkers: Supplements | Diet | Lifestyle | Combination */
  improvementPreference?: string
  /** Clarion profile type (e.g. endurance_athlete, fatigue_low_energy). Drives panel recommendation. */
  profileType?: string
  /** Height in cm (optional; used for health context and test recommendations). */
  heightCm?: string
  /** Weight in kg (optional; used for health context and test recommendations). */
  weightKg?: string
  /** When "no_pills", recommendations prefer gummies, powder, or drinks. */
  supplementFormPreference?: "any" | "no_pills"
  /** Lifestyle: activity level (e.g. sedentary, light, moderate, very_active). */
  activityLevel?: string
  /** Lifestyle: typical hours of sleep per night. */
  sleepHours?: string
  /** Lifestyle: exercise regularly Yes/No. */
  exerciseRegularly?: string
  /** Lifestyle: alcohol consumption (e.g. no, occasionally, regularly). */
  alcohol?: string
  /** Main health goal from onboarding (maps to profileType via healthGoalToProfileType). */
  healthGoal?: string
  /** Symptoms from onboarding (comma-separated or array for multi-select). */
  symptoms?: string
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
}

export function titleCase(text: string): string {
  return text
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** All biomarker keys from the database (only recommend markers we can analyze). */
export function getBiomarkerKeys(): string[] {
  const dbKeys = Object.keys(biomarkerDatabase || {})
  return dbKeys.length ? dbKeys : Array.from(CORE_BIOMARKER_KEYS)
}

/** Add age/sex/activity/goals-based markers to a panel (no duplicates, only existing keys). */
function addProfileBasedMarkers(
  basePanel: string[],
  profile: ProfileState,
  biomarkerKeys: string[]
): string[] {
  const inBase = new Set(basePanel.map((k) => normalize(k)))
  const added: string[] = []
  const add = (keys: string[]) => {
    for (const k of keys) {
      const found = biomarkerKeys.find((key) => normalize(key) === normalize(k))
      if (found && !inBase.has(normalize(found))) {
        inBase.add(normalize(found))
        added.push(found)
      }
    }
  }
  const sex = normalize(profile.sex || "")
  const sport = normalize(profile.sport || "")
  const goal = normalize(profile.goal || "")
  const ageNum = parseInt(profile.age || "0", 10)

  if (sex.includes("female")) add(["Ferritin", "Vitamin B12", "Serum iron", "TIBC"])
  if (sport.includes("endurance") || goal.includes("performance")) add(["Ferritin", "Vitamin D", "Magnesium", "hs-CRP"])
  if (sport.includes("sedentary") || goal.includes("energy")) add(["Glucose", "HbA1c", "Fasting insulin", "Triglycerides", "HDL-C"])
  if (goal.includes("heart") || goal.includes("longevity")) add(["HbA1c", "hs-CRP", "LDL-C", "ApoB", "Lipoprotein(a)"])
  if (ageNum >= 50) add(["HbA1c", "Creatinine", "BUN", "Calcium", "Vitamin D", "Vitamin B12"])
  if (ageNum >= 40) add(["HbA1c", "Triglycerides", "HDL-C", "LDL-C"])

  return [...basePanel, ...added]
}

export type AdaptivePanelOptions = {
  /** Marker keys already at optimal status — sorted to the end so the UI de-emphasizes redundant retests. */
  deprioritizeOptimalKeys?: string[]
}

function deprioritizeOptimalMarkers(
  markers: string[],
  optimalKeys: string[] | undefined
): string[] {
  if (!optimalKeys?.length) return markers
  const opt = new Set(optimalKeys.map((k) => normalize(k)))
  return [...markers].sort((a, b) => {
    const ao = opt.has(normalize(a)) ? 1 : 0
    const bo = opt.has(normalize(b)) ? 1 : 0
    return ao - bo
  })
}

export function getAdaptiveRecommendedMarkers(
  profile: ProfileState,
  biomarkerKeys: string[],
  options?: AdaptivePanelOptions
): string[] {
  let base: string[] = []

  const profileType = (profile.profileType || "").trim()
  if (profileType) {
    base = getRecommendedPanelForProfile(profileType, biomarkerKeys)
  }
  if (base.length === 0 && (profile.healthGoal || "").trim()) {
    const typeFromGoal = healthGoalToProfileType(profile.healthGoal!.trim())
    base = getRecommendedPanelForProfile(typeFromGoal, biomarkerKeys)
  }
  if (base.length === 0 && (profile.symptoms || "").trim()) {
    const sym = normalize(profile.symptoms || "")
    if (sym.includes("fatigue") || sym.includes("energy") || sym.includes("tired")) {
      base = getRecommendedPanelForProfile("fatigue_low_energy", biomarkerKeys)
    } else if (
      sym.includes("weight") ||
      sym.includes("insulin") ||
      sym.includes("bloodsugar") ||
      sym.includes("sugar")
    ) {
      base = getRecommendedPanelForProfile("weight_loss_insulin_resistance", biomarkerKeys)
    } else if (sym.includes("heart") || sym.includes("cholesterol") || sym.includes("lipid")) {
      base = getRecommendedPanelForProfile("heart_health_longevity", biomarkerKeys)
    }
  }
  if (base.length === 0) {
    const legacyType = legacyGoalSportToProfileType(profile.goal || "", profile.sport || "")
    base = getRecommendedPanelForProfile(legacyType, biomarkerKeys)
  }
  if (base.length === 0) {
    const sport = normalize(profile.sport || "")
    const goal = normalize(profile.goal || "")
    const sex = normalize(profile.sex || "")
    const wanted = new Set<string>()
    const addIfExists = (aliases: string[]) => {
      for (const alias of aliases) {
        const found = biomarkerKeys.find((k) => normalize(k) === normalize(alias))
        if (found) wanted.add(found)
      }
    }
    addIfExists(["Ferritin", "Vitamin D", "Magnesium", "Vitamin B12", "CRP", "hs-CRP"])
    if (sport.includes("endurance") || goal.includes("performance")) addIfExists(["Ferritin", "Vitamin B12"])
    if (sport.includes("sedentary") || goal.includes("energy")) addIfExists(["Glucose", "Insulin"])
    if (sex.includes("female")) addIfExists(["Ferritin", "Vitamin B12"])
    base = biomarkerKeys.filter((key) => wanted.has(key))
  }
  if (base.length === 0) base = getRecommendedPanelForProfile("general_health_adult", biomarkerKeys)

  // Health context (height/weight + profile type) can add metabolic or iron emphasis
  const healthContext = getHealthContext({
    height_cm: profile.heightCm ? Number(profile.heightCm) : undefined,
    weight_kg: profile.weightKg ? Number(profile.weightKg) : undefined,
    profile_type: profile.profileType,
    goal: profile.goal,
    sex: profile.sex,
  })
  const inBase = new Set(base.map((k) => normalize(k)))
  const addIfExists = (keys: string[]) => {
    for (const k of keys) {
      const found = biomarkerKeys.find((key) => normalize(key) === normalize(k))
      if (found && !inBase.has(normalize(found))) {
        inBase.add(normalize(found))
        base = [...base, found]
      }
    }
  }
  if (healthContext?.emphasizeMetabolic) {
    addIfExists(["HbA1c", "Fasting insulin", "Glucose", "Triglycerides", "HDL-C"])
  }
  if (healthContext?.emphasizeIron) {
    addIfExists(["Ferritin", "Serum iron", "TIBC", "Hemoglobin", "Vitamin B12"])
  }

  // When recommended panel is the 10 core (general health), don't add more markers.
  const baseSet = new Set(base.map((k) => k.trim()))
  const coreSet = new Set(CLARION_RECOMMENDED_PANEL_KEYS)
  const isCorePanel =
    profileType === "general_health_adult" ||
    (baseSet.size === coreSet.size && [...baseSet].every((k) => coreSet.has(k)))
  if (isCorePanel) {
    const keySet = new Set(biomarkerKeys.map((k) => k.trim()))
    return deprioritizeOptimalMarkers(
      CLARION_RECOMMENDED_PANEL_KEYS.filter((k) => keySet.has(k)),
      options?.deprioritizeOptimalKeys
    )
  }

  return deprioritizeOptimalMarkers(
    addProfileBasedMarkers(base, profile, biomarkerKeys),
    options?.deprioritizeOptimalKeys
  )
}

export function getMarkerReason(marker: string, profile: ProfileState): string {
  const m = normalize(marker)
  const sport = normalize(profile.sport || "")
  const sex = normalize(profile.sex || "")

  if (m.includes("ferritin")) {
    if (
      sport.includes("endurance") ||
      sport.includes("runner") ||
      sport.includes("cycling") ||
      sport.includes("tri")
    ) {
      return "High-priority for endurance athletes because low iron stores can drag energy and oxygen transport."
    }
    return "Useful for checking iron storage and fatigue context."
  }

  if (m.includes("vitamind")) {
    return "Important for recovery, immunity, and overall training resilience."
  }

  if (m.includes("magnesium")) {
    return "Useful for muscle function, nervous system balance, and recovery quality."
  }

  if (m.includes("crp")) {
    return "Helpful for spotting recovery strain or broader inflammatory load."
  }

  if (m.includes("vitaminb12") || m.includes("b12")) {
    return sex.includes("female")
      ? "Helpful for red blood cell support and energy context."
      : "Helpful for energy metabolism and red blood cell support."
  }

  if (m.includes("testosterone")) {
    return "Useful as performance context for readiness and adaptation."
  }

  if (m.includes("hemoglobin") || m.includes("hematocrit") || m.includes("rbc")) {
    return "Red blood cell markers reflect oxygen-carrying capacity and anemia context."
  }
  if (m.includes("serumiron") || m.includes("tibc") || m.includes("transferrin")) {
    return "Iron studies help confirm deficiency and guide safe repletion with ferritin."
  }
  if (m.includes("hba1c") || m.includes("glucose") || m.includes("insulin")) {
    return "Glycemic markers affect energy, metabolism, and long-term metabolic health."
  }
  if (m.includes("triglyceride") || m.includes("hdl") || m.includes("ldl") || m.includes("cholesterol") || m.includes("apob") || m.includes("lipoprotein")) {
    return "Lipids and ApoB influence cardiovascular risk; targets depend on your profile."
  }
  if (m.includes("tsh") || m.includes("freet4") || m.includes("t4")) {
    return "Thyroid markers affect energy and metabolism; interpret with your provider."
  }
  if (m.includes("hscrp") || m.includes("crp")) {
    return "Inflammation marker; useful for recovery and cardiometabolic context."
  }
  if (m.includes("esr")) {
    return "Nonspecific inflammation; interpret with symptoms and other labs."
  }
  if (m.includes("bun") || m.includes("creatinine") || m.includes("albumin")) {
    return "Kidney and nutrition context; discuss with your provider."
  }
  if (m.includes("ast") || m.includes("alt") || m.includes("bilirubin") || m.includes("alkaline")) {
    return "Liver (and sometimes muscle) context; discuss with your provider."
  }
  if (m.includes("cortisol") || m.includes("shbg") || m.includes("estradiol")) {
    return "Hormone and stress context; lifestyle and provider guidance matter."
  }

  return "Recommended based on your current profile and goals."
}

export function getInputPlaceholder(key: string): string {
  const normalized = key.toLowerCase()
  if (normalized.includes("ferritin")) return "35"
  if (normalized.includes("vitamin d")) return "28"
  if (normalized.includes("magnesium")) return "1.9"
  if (normalized.includes("b12")) return "450"
  if (normalized.includes("crp") || normalized.includes("hs-crp")) return "2.1"
  if (normalized.includes("testosterone")) return "620"
  if (normalized.includes("hemoglobin")) return "14.5"
  if (normalized.includes("hematocrit")) return "42"
  if (normalized.includes("hba1c")) return "5.4"
  if (normalized.includes("tsh")) return "2.5"
  if (normalized.includes("ldl") || normalized.includes("hdl")) return "100"
  if (normalized.includes("triglyceride")) return "120"
  if (normalized.includes("glucose")) return "90"
  if (normalized.includes("sodium")) return "140"
  if (normalized.includes("potassium")) return "4.0"
  if (normalized.includes("calcium")) return "9.5"
  if (normalized.includes("creatinine")) return "1.0"
  if (normalized.includes("bun")) return "12"
  if (normalized.includes("albumin")) return "4.2"
  if (normalized.includes("rbc")) return "5.0"
  if (normalized.includes("platelet")) return "250"
  if (normalized.includes("wbc")) return "7"
  return "—"
}

export function getActivePanel(
  selectedPanel: string[],
  recommendedMarkers: string[]
): string[] {
  return selectedPanel.length ? selectedPanel : recommendedMarkers
}

/** Tier counts for onboarding biomarker screen: first 2 = high, next 3 = moderate, rest = optional. */
const BIOMARKER_TIER_HIGH = 2
const BIOMARKER_TIER_MODERATE = 3

export function getBiomarkerTiers(markers: string[]): {
  high: string[]
  moderate: string[]
  optional: string[]
} {
  const high = markers.slice(0, BIOMARKER_TIER_HIGH)
  const moderate = markers.slice(BIOMARKER_TIER_HIGH, BIOMARKER_TIER_HIGH + BIOMARKER_TIER_MODERATE)
  const optional = markers.slice(BIOMARKER_TIER_HIGH + BIOMARKER_TIER_MODERATE)
  return { high, moderate, optional }
}

export function getEnteredBiomarkers(
  activePanel: string[],
  inputs: Record<string, string | number>
): Record<string, number> {
  const bloodworkObject: Record<string, number> = {}

  activePanel.forEach((key) => {
    const rawValue = inputs[key]
    if (String(rawValue ?? "").trim() === "") return

    const parsedValue = Number(rawValue)
    if (Number.isNaN(parsedValue)) return

    bloodworkObject[key] = parsedValue
  })

  return bloodworkObject
}

export function hasEnoughLabs(
  enteredCount: number,
  activePanelLength: number
): boolean {
  return enteredCount >= Math.min(3, activePanelLength || 3)
}
