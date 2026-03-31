/**
 * Clarion Lite: education-only supplement *topics* from symptoms and profile — not lab results.
 * Do not use this output as if it were biomarker-personalized dosing.
 */

import { getSupplementPreset, SUPPLEMENT_PRESETS, type SupplementPreset } from "@/src/lib/supplementMetadata"

const LITE_DISCLAIMER =
  "Education only—not medical advice and not based on your bloodwork. Discuss supplements with a clinician, especially if you take medications or have conditions."

/** Symptom id → preset ids (chips in CurrentSupplementsEditor) to suggest as “often discussed in context of…” */
const SYMPTOM_TO_PRESET_IDS: Record<string, string[]> = {
  fatigue: ["iron", "b12", "vitamin_d", "magnesium"],
  low_energy: ["iron", "b12", "vitamin_d", "magnesium"],
  brain_fog: ["b12", "omega3", "magnesium"],
  poor_recovery: ["magnesium", "omega3", "vitamin_d"],
  sleep_issues: ["magnesium", "vitamin_d"],
}

function normalizeSymptomList(symptoms?: string | null): string[] {
  if (!symptoms?.trim() || symptoms === "none") return []
  return symptoms
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function whyLineForPreset(preset: SupplementPreset, symptomLabels: string[]): string {
  const ctx =
    symptomLabels.length > 0
      ? `people who report ${symptomLabels.join(", ")}`
      : "your profile and goals"
  return `${preset.displayName} is commonly discussed in the context of ${ctx}—not because Clarion measured your blood.`
}

export type LiteSupplementSuggestion = {
  presetId: string
  displayName: string
  whySuggested: string
  basis: "symptom_profile"
  disclaimer: string
}

/**
 * Build a de-duplicated list of Lite suggestions from profile fields.
 * If nothing matches, returns a small general-wellness set (still educational-only).
 */
export function buildLiteSupplementSuggestions(input: {
  symptoms?: string | null
  profile_type?: string | null
  improvement_preference?: string | null
}): LiteSupplementSuggestion[] {
  const symptomIds = normalizeSymptomList(input.symptoms)
  const presetIds = new Set<string>()

  for (const sid of symptomIds) {
    const ids = SYMPTOM_TO_PRESET_IDS[sid]
    if (ids) ids.forEach((id) => presetIds.add(id))
  }

  const pt = (input.profile_type || "").toLowerCase()
  if (pt.includes("fatigue") || pt.includes("low_energy")) {
    ;["iron", "b12", "vitamin_d", "magnesium"].forEach((id) => presetIds.add(id))
  }
  if (pt.includes("endurance") || pt.includes("athlete")) {
    ;["iron", "vitamin_d", "magnesium", "omega3"].forEach((id) => presetIds.add(id))
  }
  if (pt.includes("sleep") || symptomIds.includes("sleep_issues")) {
    ;["magnesium", "vitamin_d"].forEach((id) => presetIds.add(id))
  }
  if (pt.includes("inflammation") || pt.includes("recovery")) {
    ;["omega3", "magnesium", "vitamin_d"].forEach((id) => presetIds.add(id))
  }

  if (presetIds.size === 0) {
    ;["vitamin_d", "magnesium", "omega3"].forEach((id) => presetIds.add(id))
  }

  const symptomLabels = symptomIds
    .filter((s) => s !== "none")
    .map((s) => s.replace(/_/g, " "))

  const list: LiteSupplementSuggestion[] = []
  for (const id of presetIds) {
    const preset = getSupplementPreset(id)
    if (!preset) continue
    list.push({
      presetId: preset.id,
      displayName: preset.displayName,
      whySuggested: whyLineForPreset(preset, symptomLabels),
      basis: "symptom_profile",
      disclaimer: LITE_DISCLAIMER,
    })
  }

  const order = new Map(SUPPLEMENT_PRESETS.map((p, i) => [p.id, i]))
  list.sort((a, b) => (order.get(a.presetId) ?? 99) - (order.get(b.presetId) ?? 99))

  return list
}

export { LITE_DISCLAIMER }
