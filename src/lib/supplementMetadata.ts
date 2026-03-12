/**
 * Single source of truth for supplement presets used in onboarding and stack comparison.
 * Use these ids/labels everywhere; do not hardcode supplement names in multiple places.
 */

export type SupplementPreset = {
  id: string
  label: string
  /** Alternate names for matching user input or recommendations (e.g. "Fish oil" → omega3) */
  aliases: string[]
  category: "vitamin" | "mineral" | "fatty-acid" | "amino" | "other" | "probiotic"
  /** Default display name in UI */
  displayName: string
}

export const SUPPLEMENT_PRESETS: SupplementPreset[] = [
  { id: "vitamin_d", label: "Vitamin D", aliases: ["vitamin d", "vit d", "d3", "cholecalciferol"], category: "vitamin", displayName: "Vitamin D" },
  { id: "magnesium", label: "Magnesium", aliases: ["magnesium", "mg", "magnesium glycinate", "magnesium citrate", "magnesium oxide"], category: "mineral", displayName: "Magnesium" },
  { id: "omega3", label: "Omega-3 / Fish oil", aliases: ["omega-3", "omega 3", "fish oil", "epa", "dha"], category: "fatty-acid", displayName: "Omega-3 / Fish oil" },
  { id: "iron", label: "Iron", aliases: ["iron", "ferrous", "ferritin support"], category: "mineral", displayName: "Iron" },
  { id: "zinc", label: "Zinc", aliases: ["zinc"], category: "mineral", displayName: "Zinc" },
  { id: "creatine", label: "Creatine", aliases: ["creatine"], category: "amino", displayName: "Creatine" },
  { id: "protein_powder", label: "Protein powder", aliases: ["protein", "protein powder", "whey", "plant protein"], category: "amino", displayName: "Protein powder" },
  { id: "b12", label: "B12", aliases: ["b12", "vitamin b12", "cobalamin"], category: "vitamin", displayName: "B12" },
  { id: "folate", label: "Folate", aliases: ["folate", "folic acid", "methylfolate", "5-mthf"], category: "vitamin", displayName: "Folate" },
  { id: "fiber", label: "Fiber", aliases: ["fiber", "fibre", "psyllium"], category: "other", displayName: "Fiber" },
  { id: "electrolytes", label: "Electrolytes", aliases: ["electrolytes", "sodium", "potassium", "lmnt", "liquid iv"], category: "mineral", displayName: "Electrolytes" },
  { id: "multivitamin", label: "Multivitamin", aliases: ["multivitamin", "multi", "mv"], category: "vitamin", displayName: "Multivitamin" },
  { id: "probiotic", label: "Probiotic", aliases: ["probiotic", "probiotics"], category: "probiotic", displayName: "Probiotic" },
]

const PRESET_BY_ID = new Map(SUPPLEMENT_PRESETS.map((p) => [p.id, p]))
const NORMALIZE = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

/** Get preset by id. */
export function getSupplementPreset(id: string): SupplementPreset | undefined {
  return PRESET_BY_ID.get(id)
}

/** Resolve a user-facing label (or alias) to a preset id if it matches; otherwise return null (custom). */
export function resolveSupplementToPresetId(label: string): string | null {
  const n = NORMALIZE(label)
  if (!n) return null
  for (const p of SUPPLEMENT_PRESETS) {
    if (NORMALIZE(p.label) === n || p.aliases.some((a) => NORMALIZE(a) === n)) return p.id
  }
  return null
}

/** Get display name for a supplement id or custom name. */
export function getSupplementDisplayName(idOrCustom: string): string {
  const preset = PRESET_BY_ID.get(idOrCustom)
  return preset ? preset.displayName : idOrCustom
}

/** Check if two supplement identifiers refer to the same thing (for stack comparison). */
export function sameSupplement(a: string, b: string): boolean {
  if (a === b) return true
  const presetA = PRESET_BY_ID.get(a)
  const presetB = PRESET_BY_ID.get(b)
  if (presetA && presetB) return presetA.id === presetB.id
  return NORMALIZE(a) === NORMALIZE(b)
}

/** All preset ids in display order. */
export function getPresetIds(): string[] {
  return SUPPLEMENT_PRESETS.map((p) => p.id)
}

/** Parse current_supplements from DB/state: "No", JSON array, or legacy comma-separated. */
export function parseCurrentSupplementsList(raw: string): string[] {
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "no") return []
  const t = raw.trim()
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []
    } catch {
      return []
    }
  }
  return t.split(",").map((s) => s.trim()).filter(Boolean)
}

/** Serialize list to string for DB/state (array of preset ids + custom names). */
export function serializeCurrentSupplementsList(list: string[]): string {
  if (list.length === 0) return ""
  return JSON.stringify(list)
}

/** Map recommendation supplementKey or marker name to our preset id for comparison. */
const RECOMMENDATION_KEY_TO_PRESET: Record<string, string> = {
  vitamind: "vitamin_d",
  "vitamin d": "vitamin_d",
  ferritin: "iron",
  iron: "iron",
  magnesium: "magnesium",
  mg: "magnesium",
  omega3: "omega3",
  "omega-3": "omega3",
  "fish oil": "omega3",
  b12: "b12",
  vitaminb12: "b12",
  folate: "folate",
  "folic acid": "folate",
  zinc: "zinc",
  creatine: "creatine",
  protein: "protein_powder",
  "protein powder": "protein_powder",
  fiber: "fiber",
  electrolytes: "electrolytes",
  multivitamin: "multivitamin",
  probiotic: "probiotic",
}

export function recommendationKeyToPresetId(supplementKeyOrMarker: string): string | null {
  const n = supplementKeyOrMarker.toLowerCase().replace(/\s+/g, " ").trim()
  return RECOMMENDATION_KEY_TO_PRESET[n] ?? PRESET_BY_ID.get(n)?.id ?? null
}
