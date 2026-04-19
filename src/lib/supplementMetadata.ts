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
  {
    id: "protein_powder",
    label: "Protein powder",
    aliases: ["protein powder", "whey protein", "plant protein"],
    category: "amino",
    displayName: "Protein powder",
  },
  { id: "b12", label: "B12", aliases: ["b12", "vitamin b12", "cobalamin"], category: "vitamin", displayName: "B12" },
  { id: "folate", label: "Folate", aliases: ["folate", "folic acid", "methylfolate", "5-mthf"], category: "vitamin", displayName: "Folate" },
  { id: "fiber", label: "Fiber", aliases: ["fiber", "fibre", "psyllium"], category: "other", displayName: "Fiber" },
  {
    id: "electrolytes",
    label: "Electrolytes",
    aliases: ["electrolytes", "electrolyte", "lmnt", "liquid iv", "hydration mix"],
    category: "mineral",
    displayName: "Electrolytes",
  },
  { id: "multivitamin", label: "Multivitamin", aliases: ["multivitamin", "multi", "mv"], category: "vitamin", displayName: "Multivitamin" },
  { id: "probiotic", label: "Probiotic", aliases: ["probiotic", "probiotics"], category: "probiotic", displayName: "Probiotic" },
  { id: "calcium", label: "Calcium", aliases: ["calcium", "calcium citrate", "calcium carbonate"], category: "mineral", displayName: "Calcium" },
  { id: "potassium", label: "Potassium", aliases: ["potassium", "potassium chloride", "potassium gluconate"], category: "mineral", displayName: "Potassium" },
  { id: "selenium", label: "Selenium", aliases: ["selenium"], category: "mineral", displayName: "Selenium" },
  { id: "iodine", label: "Iodine", aliases: ["iodine", "kelp"], category: "mineral", displayName: "Iodine" },
  { id: "chromium", label: "Chromium", aliases: ["chromium", "chromium picolinate"], category: "mineral", displayName: "Chromium" },
  { id: "vitamin_c", label: "Vitamin C", aliases: ["vitamin c", "vit c", "ascorbic acid", "ascorbate"], category: "vitamin", displayName: "Vitamin C" },
  { id: "vitamin_k2", label: "Vitamin K2", aliases: ["vitamin k2", "k2", "mk-7", "mk7", "menaquinone"], category: "vitamin", displayName: "Vitamin K2" },
  { id: "vitamin_e", label: "Vitamin E", aliases: ["vitamin e", "tocopherol"], category: "vitamin", displayName: "Vitamin E" },
  { id: "biotin", label: "Biotin", aliases: ["biotin", "b7", "vitamin b7"], category: "vitamin", displayName: "Biotin" },
  {
    id: "b_complex",
    label: "B-complex",
    aliases: ["b complex", "b-complex", "b complex vitamins", "b vitamins"],
    category: "vitamin",
    displayName: "B-complex",
  },
  { id: "coq10", label: "CoQ10", aliases: ["coq10", "coenzyme q10", "ubiquinol", "ubiquinone"], category: "other", displayName: "CoQ10" },
  {
    id: "collagen",
    label: "Collagen",
    aliases: ["collagen", "collagen peptides", "collagen powder"],
    category: "other",
    displayName: "Collagen",
  },
  { id: "melatonin", label: "Melatonin", aliases: ["melatonin"], category: "other", displayName: "Melatonin" },
  { id: "ashwagandha", label: "Ashwagandha", aliases: ["ashwagandha"], category: "other", displayName: "Ashwagandha" },
  {
    id: "turmeric",
    label: "Turmeric / Curcumin",
    aliases: ["turmeric", "curcumin", "curcuma"],
    category: "other",
    displayName: "Turmeric / Curcumin",
  },
  { id: "l_theanine", label: "L-Theanine", aliases: ["theanine", "l-theanine", "l theanine"], category: "amino", displayName: "L-Theanine" },
  { id: "bcaa", label: "BCAAs", aliases: ["bcaa", "bcaas", "branched chain amino acids"], category: "amino", displayName: "BCAAs" },
  { id: "glutamine", label: "L-Glutamine", aliases: ["glutamine", "l-glutamine", "l glutamine"], category: "amino", displayName: "L-Glutamine" },
  { id: "beta_alanine", label: "Beta-alanine", aliases: ["beta alanine", "beta-alanine"], category: "amino", displayName: "Beta-alanine" },
  { id: "citrulline", label: "Citrulline", aliases: ["citrulline", "l-citrulline", "l citrulline"], category: "amino", displayName: "Citrulline" },
  { id: "nac", label: "NAC", aliases: ["nac", "n-acetylcysteine", "n acetyl cysteine"], category: "other", displayName: "NAC" },
  { id: "berberine", label: "Berberine", aliases: ["berberine"], category: "other", displayName: "Berberine" },
  {
    id: "prenatal",
    label: "Prenatal multivitamin",
    aliases: ["prenatal", "prenatal vitamin", "prenatal multi"],
    category: "vitamin",
    displayName: "Prenatal multivitamin",
  },
  {
    id: "greens_powder",
    label: "Greens powder",
    aliases: ["greens powder", "green powder", "supergreens"],
    category: "other",
    displayName: "Greens powder",
  },
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

/** Score how well `query` matches a preset (higher = better).0 = no match. */
function presetSearchScore(p: SupplementPreset, queryNorm: string): number {
  if (!queryNorm) return 1
  const label = NORMALIZE(p.label)
  const display = NORMALIZE(p.displayName)
  if (label === queryNorm || display === queryNorm) return 100
  for (const a of p.aliases) {
    const an = NORMALIZE(a)
    if (an === queryNorm) return 98
  }
  if (label.startsWith(queryNorm) || display.startsWith(queryNorm)) return 85
  for (const a of p.aliases) {
    const an = NORMALIZE(a)
    if (an.startsWith(queryNorm)) return 82
  }
  const cat = p.category.replace("-", " ")
  if (cat.includes(queryNorm)) return 45
  if (label.includes(queryNorm) || display.includes(queryNorm)) return 70
  for (const a of p.aliases) {
    if (NORMALIZE(a).includes(queryNorm)) return 65
  }
  return 0
}

/**
 * Search built-in supplement presets (labels + aliases). Empty query returns all presets in catalog order.
 */
export function searchSupplementPresets(query: string, limit = 20): SupplementPreset[] {
  const q = NORMALIZE(query)
  if (!q) return [...SUPPLEMENT_PRESETS]
  const scored = SUPPLEMENT_PRESETS.map((p) => ({ p, s: presetSearchScore(p, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.label.localeCompare(b.p.label))
  return scored.map((x) => x.p).slice(0, limit)
}

/** One row the user takes today — preset chip and/or custom name, optional product link. */
export type CurrentSupplementEntry = {
  id?: string
  /** Stable id for edits/deletes (generated client-side). */
  clientId?: string
  name: string
  productUrl?: string
  /** User-entered dose (e.g. "1 cap with breakfast"). */
  dose?: string
  /** Result of stack-product-fit check. */
  fitStatus?: "aligned" | "suboptimal" | "unknown"
  /** User chose to keep their linked product despite suboptimal fit. */
  userChoseKeepProduct?: boolean
}

/** Lifestyle presets that are easy to false-positive from OCR/AI; require an explicit label match for merge + stack. */
export function isExplicitLifestylePresetLabel(presetId: string, label: string): boolean {
  const n = NORMALIZE(label)
  if (presetId === "electrolytes") {
    return (
      n === "electrolytes" ||
      n === "electrolyte" ||
      n.includes("lmnt") ||
      n.includes("liquid iv") ||
      n.includes("hydration mix")
    )
  }
  if (presetId === "protein_powder") {
    return n.includes("protein powder") || n === "whey protein" || n === "plant protein"
  }
  return true
}

function normalizeSupplementEntry(x: unknown): CurrentSupplementEntry | null {
  if (typeof x === "string") {
    const preset = getSupplementPreset(x)
    if (preset) return { id: preset.id, name: preset.displayName }
    const resolved = resolveSupplementToPresetId(x)
    if (resolved) {
      const p = getSupplementPreset(resolved)
      if (!p) return { name: x.trim() }
      if (
        (resolved === "electrolytes" || resolved === "protein_powder") &&
        !isExplicitLifestylePresetLabel(resolved, x)
      ) {
        return { name: x.trim() }
      }
      return { id: p.id, name: p.displayName }
    }
    return { name: x.trim() }
  }
  if (x && typeof x === "object") {
    const o = x as {
      id?: string
      clientId?: string
      name?: string
      url?: string
      productUrl?: string
      dose?: string
      fitStatus?: string
      userChoseKeepProduct?: boolean
    }
    const url = (o.productUrl ?? o.url ?? "").trim()
    const productUrl = url.length > 0 ? url : undefined
    const clientId = typeof o.clientId === "string" && o.clientId.trim() ? o.clientId.trim() : undefined
    const dose = typeof o.dose === "string" && o.dose.trim() ? o.dose.trim() : undefined
    const fitStatus =
      o.fitStatus === "aligned" || o.fitStatus === "suboptimal" || o.fitStatus === "unknown" ? o.fitStatus : undefined
    const userChoseKeepProduct = o.userChoseKeepProduct === true
    const fitExtra: Pick<CurrentSupplementEntry, "fitStatus" | "userChoseKeepProduct"> = {
      ...(fitStatus ? { fitStatus } : {}),
      ...(userChoseKeepProduct ? { userChoseKeepProduct: true } : {}),
    }
    if (o.id && getSupplementPreset(o.id)) {
      const p = getSupplementPreset(o.id)!
      const rawName = (o.name ?? "").trim()
      if (rawName) {
        const rn = NORMALIZE(rawName)
        if (p.id === "electrolytes" && (rn === "sodium" || rn === "potassium")) {
          return { name: rawName, productUrl, ...(clientId ? { clientId } : {}), ...(dose ? { dose } : {}), ...fitExtra }
        }
        if (p.id === "protein_powder" && (rn === "whey" || rn === "protein")) {
          return { name: rawName, productUrl, ...(clientId ? { clientId } : {}), ...(dose ? { dose } : {}), ...fitExtra }
        }
      }
      return { id: p.id, name: p.displayName, productUrl, ...(clientId ? { clientId } : {}), ...(dose ? { dose } : {}), ...fitExtra }
    }
    const name = (o.name ?? "").trim()
    if (!name) return null
    return { name, productUrl, ...(clientId ? { clientId } : {}), ...(dose ? { dose } : {}), ...fitExtra }
  }
  return null
}

/**
 * Structured list for UI (chips + links). Supports legacy comma text and JSON string[].
 */
export function parseCurrentSupplementsEntries(raw: string): CurrentSupplementEntry[] {
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "no") return []
  const t = raw.trim()
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown
      if (!Array.isArray(arr)) return []
      return arr.map(normalizeSupplementEntry).filter((e): e is CurrentSupplementEntry => e != null && Boolean(e.name))
    } catch {
      return []
    }
  }
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => normalizeSupplementEntry(name))
    .filter((e): e is CurrentSupplementEntry => e != null)
}

/** For stack comparison: preset id when known, else label text. */
export function parseCurrentSupplementsList(raw: string): string[] {
  return parseCurrentSupplementsEntries(raw).map((e) => (e.id ? e.id : e.name))
}

/** Serialize structured entries for `profiles.current_supplements`. */
export function serializeCurrentSupplementsEntries(entries: CurrentSupplementEntry[]): string {
  const cleaned = entries
    .map((e) => ({
      ...(e.id ? { id: e.id } : {}),
      ...(e.clientId?.trim() ? { clientId: e.clientId.trim() } : {}),
      name: e.name.trim(),
      ...(e.productUrl?.trim() ? { productUrl: e.productUrl.trim() } : {}),
      ...(e.dose?.trim() ? { dose: e.dose.trim() } : {}),
      ...(e.fitStatus ? { fitStatus: e.fitStatus } : {}),
      ...(e.userChoseKeepProduct ? { userChoseKeepProduct: true } : {}),
    }))
    .filter((e) => e.name.length > 0)
  if (cleaned.length === 0) return ""
  return JSON.stringify(cleaned)
}

/** Merge AI/barcode-detected names into existing serialized profile supplements (deduped by name). */
export function mergeSupplementNamesIntoSerialized(current: string, names: string[]): string {
  const entries = parseCurrentSupplementsEntries(current)
  const existing = new Set(entries.map((e) => e.name.toLowerCase()))
  for (const raw of names) {
    const t = raw.trim()
    if (!t) continue
    if (existing.has(t.toLowerCase())) continue
    const presetId = resolveSupplementToPresetId(t)
    if (presetId) {
      const preset = getSupplementPreset(presetId)
      if (preset) {
        if (
          (presetId === "electrolytes" || presetId === "protein_powder") &&
          !isExplicitLifestylePresetLabel(presetId, t)
        ) {
          entries.push({ name: t })
          existing.add(t.toLowerCase())
        } else {
          entries.push({ id: preset.id, name: preset.displayName })
          existing.add(preset.displayName.toLowerCase())
        }
      }
    } else {
      entries.push({ name: t })
      existing.add(t.toLowerCase())
    }
  }
  return serializeCurrentSupplementsEntries(entries)
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
  "protein powder": "protein_powder",
  fiber: "fiber",
  electrolytes: "electrolytes",
  multivitamin: "multivitamin",
  probiotic: "probiotic",
  calcium: "calcium",
  potassium: "potassium",
  selenium: "selenium",
  iodine: "iodine",
  chromium: "chromium",
  vitaminc: "vitamin_c",
  "vitamin c": "vitamin_c",
  "ascorbic acid": "vitamin_c",
  vitamink2: "vitamin_k2",
  "vitamin k2": "vitamin_k2",
  mk7: "vitamin_k2",
  vitamine: "vitamin_e",
  "vitamin e": "vitamin_e",
  biotin: "biotin",
  bcomplex: "b_complex",
  "b complex": "b_complex",
  "b-complex": "b_complex",
  coq10: "coq10",
  "coenzyme q10": "coq10",
  ubiquinol: "coq10",
  collagen: "collagen",
  melatonin: "melatonin",
  ashwagandha: "ashwagandha",
  turmeric: "turmeric",
  curcumin: "turmeric",
  theanine: "l_theanine",
  "l-theanine": "l_theanine",
  bcaa: "bcaa",
  bcaas: "bcaa",
  glutamine: "glutamine",
  betaalanine: "beta_alanine",
  "beta alanine": "beta_alanine",
  citrulline: "citrulline",
  nac: "nac",
  "n-acetylcysteine": "nac",
  berberine: "berberine",
  prenatal: "prenatal",
  "prenatal vitamin": "prenatal",
  greenpowder: "greens_powder",
  "greens powder": "greens_powder",
  supergreens: "greens_powder",
}

export function recommendationKeyToPresetId(supplementKeyOrMarker: string): string | null {
  const n = supplementKeyOrMarker.toLowerCase().replace(/\s+/g, " ").trim()
  return RECOMMENDATION_KEY_TO_PRESET[n] ?? PRESET_BY_ID.get(n)?.id ?? null
}
