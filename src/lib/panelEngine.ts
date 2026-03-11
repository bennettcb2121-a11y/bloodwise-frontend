/**
 * Panel and biomarker selection: keys, recommended markers by profile, reasons, placeholders, entered data.
 */

import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import {
  getRecommendedPanelForProfile,
  legacyGoalSportToProfileType,
  CORE_BIOMARKER_KEYS,
} from "@/src/lib/clarionProfiles"

export type ProfileState = {
  age: string
  sex: string
  sport: string
  goal: string
  /** How user prefers to improve biomarkers: Supplements | Diet | Lifestyle | Combination */
  improvementPreference?: string
  /** Clarion profile type (e.g. endurance_athlete, fatigue_low_energy). Drives panel recommendation. */
  profileType?: string
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

export function getAdaptiveRecommendedMarkers(
  profile: ProfileState,
  biomarkerKeys: string[]
): string[] {
  // Prefer profile-type-based panel when user has selected a Clarion profile type
  const profileType = (profile.profileType || "").trim()
  if (profileType) {
    const recommended = getRecommendedPanelForProfile(profileType, biomarkerKeys)
    if (recommended.length > 0) return recommended
  }

  // Fallback: legacy goal + sport → profile type, then get panel
  const legacyType = legacyGoalSportToProfileType(profile.goal || "", profile.sport || "")
  const legacyPanel = getRecommendedPanelForProfile(legacyType, biomarkerKeys)
  if (legacyPanel.length > 0) return legacyPanel

  // Last resort: legacy addIfExists logic
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
  const legacy = biomarkerKeys.filter((key) => wanted.has(key))
  if (legacy.length > 0) return legacy

  // Always show something: default to general health adult panel so user sees biomarkers
  return getRecommendedPanelForProfile("general_health_adult", biomarkerKeys)
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
