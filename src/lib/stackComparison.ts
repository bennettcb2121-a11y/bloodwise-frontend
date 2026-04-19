/**
 * Compares user's current supplements to the recommended stack and returns
 * structured status for each recommendation: already_taking, upgrade_recommended, unnecessary, missing.
 * Reusable logic for the stack/results flow.
 */

import {
  sameSupplement,
  getSupplementDisplayName,
  recommendationKeyToPresetId,
  parseCurrentSupplementsList,
  parseCurrentSupplementsEntries,
  getSupplementPreset,
  resolveSupplementToPresetId,
} from "./supplementMetadata"

/** Preferred form hints for "upgrade recommended" (Clarion prefers these over others). */
const PREFERRED_FORMS: Record<string, string> = {
  magnesium: "magnesium glycinate",
  iron: "iron bisglycinate",
  vitamin_d: "vitamin D3",
  b12: "methylcobalamin",
  omega3: "omega-3 (EPA/DHA)",
}

export type StackItemStatus = "already_taking" | "upgrade_recommended" | "unnecessary" | "missing"

export type ComparedStackItem = {
  /** Original recommendation fields */
  supplementKey: string
  marker: string
  name: string
  dose: string
  whyRecommended?: string
  whyThisIsRecommended?: string
  estimatedMonthlyCost?: number
  bestValue?: unknown
  bestOverall?: unknown
  leaderboard?: unknown[]
  [key: string]: unknown
  /** Comparison result */
  status: StackItemStatus
  /** Short message for UI (supportive, not judgmental) */
  statusMessage: string
  /** Preferred form name if status is upgrade_recommended */
  preferredForm?: string
}

/**
 * Check if the user's current list includes something that matches this recommendation
 * (same nutrient, possibly different form).
 */
function userHasMatchingSupplement(
  currentList: string[],
  recommendedPresetId: string | null,
  recommendedName: string
): boolean {
  if (!recommendedPresetId) return false
  const n = recommendedName.toLowerCase()
  for (const item of currentList) {
    const preset = getSupplementPreset(item)
    if (preset && preset.id === recommendedPresetId) return true
    if (!preset && n.includes(item.toLowerCase())) return true
  }
  return false
}

/**
 * Check if user has this nutrient in a form we consider "inferior" (e.g. magnesium oxide vs glycinate).
 * Returns preferred form string if upgrade is recommended.
 */
function getUpgradeHint(
  currentList: string[],
  recommendedPresetId: string | null,
  recommendedName: string
): string | null {
  const preferred = recommendedPresetId ? PREFERRED_FORMS[recommendedPresetId] : null
  if (!preferred) return null
  const preferredLower = preferred.toLowerCase()
  const recLower = recommendedName.toLowerCase()
  if (recLower.includes(preferredLower)) return null
  for (const item of currentList) {
    const preset = getSupplementPreset(item)
    if (!preset || preset.id !== recommendedPresetId) continue
    const display = getSupplementDisplayName(item).toLowerCase()
    if (display.includes("oxide") || display.includes("citrate") && preferredLower.includes("glycinate"))
      return preferred
    if (preferredLower.includes("glycinate") && !display.includes("glycinate")) return preferred
  }
  return null
}

/**
 * Compare current supplements (raw string from profile) to recommended stack.
 * Returns recommended items with status and statusMessage.
 */
export function compareStackToCurrentSupplements(
  currentSupplementsRaw: string,
  recommendedStack: { supplementKey?: string; marker?: string; name?: string; dose?: string; [key: string]: unknown }[]
): ComparedStackItem[] {
  const currentList = parseCurrentSupplementsList(currentSupplementsRaw)
  const result: ComparedStackItem[] = []

  for (const rec of recommendedStack) {
    const supplementKey = (rec.supplementKey ?? rec.marker ?? rec.name ?? "").toString()
    const marker = (rec.marker ?? rec.name ?? "").toString()
    const name = (rec.name ?? supplementKey ?? marker).toString()
    const presetId = recommendationKeyToPresetId(supplementKey) ?? recommendationKeyToPresetId(marker) ?? null

    const hasMatching = userHasMatchingSupplement(currentList, presetId, name)
    const upgradeForm = getUpgradeHint(currentList, presetId, name)

    let status: StackItemStatus = "missing"
    let statusMessage: string
    let preferredForm: string | undefined

    if (hasMatching && upgradeForm) {
      status = "upgrade_recommended"
      preferredForm = upgradeForm
      statusMessage =
        `You're already taking ${getSupplementDisplayName(presetId ?? name)}, but your current form may not be ideal for absorption or tolerability. Clarion recommends ${upgradeForm} instead.`
    } else if (hasMatching) {
      status = "already_taking"
      statusMessage =
        "You're already taking this. Based on your lab value, your current dose may still need adjustment—consider retesting to confirm you're in range."
    } else {
      status = "missing"
      statusMessage = "New recommendation based on your biomarkers."
    }

    result.push({
      ...rec,
      supplementKey,
      marker,
      name,
      dose: (rec.dose ?? "").toString(),
      status,
      statusMessage,
      preferredForm,
    })
  }

  return result
}

/**
 * Classify items the user takes that are NOT in the recommended stack (unnecessary for current priorities).
 */
export function getUnnecessaryCurrentSupplements(
  currentSupplementsRaw: string,
  recommendedStack: { supplementKey?: string; marker?: string; name?: string }[]
): string[] {
  const currentList = parseCurrentSupplementsList(currentSupplementsRaw)
  const recommendedPresetIds = new Set<string>()
  for (const rec of recommendedStack) {
    const id = recommendationKeyToPresetId((rec.supplementKey ?? rec.marker ?? rec.name ?? "").toString())
    if (id) recommendedPresetIds.add(id)
  }
  const unnecessary: string[] = []
  for (const item of currentList) {
    const preset = getSupplementPreset(item)
    const id = preset?.id ?? item
    if (!recommendedPresetIds.has(id)) unnecessary.push(getSupplementDisplayName(item))
  }
  return unnecessary
}

/** Map preset id → biomarker key when lab "high" should trigger a review (don’t add more). */
const PRESET_ID_TO_MARKER_FOR_HIGH_LAB: Record<string, string> = {
  vitamin_d: "Vitamin D",
  b12: "Vitamin B12",
  iron: "Ferritin",
  magnesium: "Magnesium",
  folate: "Folate",
}

export type LabReviewStackItem = {
  presetId: string
  displayName: string
  marker: string
  statusMessage: string
}

/**
 * Supplements the user already takes that align with a biomarker Clarion flags as high —
 * show in stack with a review note (e.g. vitamin D high but user still lists D).
 */
export function getLabReviewItemsForCurrentSupplements(
  currentSupplementsRaw: string,
  analysis: { name?: string; status?: string }[]
): LabReviewStackItem[] {
  const highMarkers = new Set<string>()
  for (const row of analysis) {
    if (!row.name) continue
    if ((row.status || "").toLowerCase() !== "high") continue
    highMarkers.add(row.name)
  }
  if (highMarkers.size === 0) return []

  const entries = parseCurrentSupplementsEntries(currentSupplementsRaw)
  const out: LabReviewStackItem[] = []
  const seenPreset = new Set<string>()

  for (const e of entries) {
    const presetId = e.id ?? resolveSupplementToPresetId(e.name) ?? ""
    if (!presetId) continue
    const marker = PRESET_ID_TO_MARKER_FOR_HIGH_LAB[presetId]
    if (!marker || !highMarkers.has(marker)) continue
    if (seenPreset.has(presetId)) continue
    seenPreset.add(presetId)
    out.push({
      presetId,
      displayName: e.name,
      marker,
      statusMessage: `Your ${marker} is above your current Clarion target. If you’re still taking this, review dose with your clinician—don’t add more unless advised.`,
    })
  }
  return out
}
