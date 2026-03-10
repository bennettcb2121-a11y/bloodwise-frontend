/**
 * Panel and biomarker selection: keys, recommended markers by profile, reasons, placeholders, entered data.
 */

import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"

export type ProfileState = {
  age: string
  sex: string
  sport: string
  goal: string
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

export function getBiomarkerKeys(): string[] {
  const keys = Object.keys(biomarkerDatabase || {})
  return keys.length
    ? keys
    : ["Ferritin", "Vitamin D", "Magnesium", "Vitamin B12", "CRP", "Testosterone"]
}

export function getAdaptiveRecommendedMarkers(
  profile: ProfileState,
  biomarkerKeys: string[]
): string[] {
  const sport = normalize(profile.sport || "")
  const goal = normalize(profile.goal || "")
  const sex = normalize(profile.sex || "")

  const wanted = new Set<string>()

  const addIfExists = (aliases: string[]) => {
    for (const alias of aliases) {
      const found = biomarkerKeys.find(
        (key) => normalize(key) === normalize(alias)
      )
      if (found) {
        wanted.add(found)
        return
      }
    }
  }

  const isEnduranceSport =
    sport.includes("endurance") ||
    sport.includes("runner") ||
    sport.includes("cycling") ||
    sport.includes("tri")
  const isHybrid = sport.includes("hybrid") || sport.includes("mixed")
  const isSedentary = sport.includes("sedentary")

  // Base panel for everyone
  addIfExists(["Ferritin"])
  addIfExists(["Vitamin D"])
  addIfExists(["Magnesium"])
  addIfExists(["CRP"])

  if (isEnduranceSport) {
    addIfExists(["Ferritin"])
    addIfExists(["Vitamin B12"])
    addIfExists(["Testosterone"])
  }

  if (isHybrid) {
    addIfExists(["Vitamin B12"])
    addIfExists(["Testosterone"])
  }

  if (isSedentary) {
    addIfExists(["Glucose"])
    addIfExists(["Insulin"])
  }

  if (
    goal.includes("performance") ||
    goal.includes("recovery") ||
    goal.includes("energy")
  ) {
    addIfExists(["Vitamin D"])
    addIfExists(["Magnesium"])
    addIfExists(["CRP"])
  }

  if (goal.includes("energy")) {
    addIfExists(["Glucose"])
    addIfExists(["Insulin"])
  }

  if (goal.includes("general") || goal.includes("wellness") || goal.includes("longevity")) {
    addIfExists(["Vitamin D"])
    addIfExists(["Vitamin B12"])
  }

  if (sex.includes("female")) {
    addIfExists(["Ferritin"])
    addIfExists(["Vitamin B12"])
  }

  const filtered = biomarkerKeys.filter((key) => wanted.has(key))
  if (isEnduranceSport && filtered.length > 0) {
    const ferritinKey = biomarkerKeys.find((k) => normalize(k) === "ferritin")
    if (ferritinKey && filtered.includes(ferritinKey)) {
      return [ferritinKey, ...filtered.filter((k) => k !== ferritinKey)]
    }
  }
  return filtered
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

  return "Recommended based on your current profile and goals."
}

export function getInputPlaceholder(key: string): string {
  const normalized = key.toLowerCase()
  if (normalized.includes("ferritin")) return "35"
  if (normalized.includes("vitamin d")) return "28"
  if (normalized.includes("magnesium")) return "1.9"
  if (normalized.includes("b12")) return "450"
  if (normalized.includes("crp")) return "2.1"
  if (normalized.includes("testosterone")) return "620"
  return "Enter"
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
