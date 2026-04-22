/**
 * Supplement monogram + gradient visual system.
 *
 * We don't use hotlinked Amazon product images across the app because:
 *  - Amazon's Associates Program Operating Agreement requires images
 *    obtained via the Product Advertising API (we don't have credentials).
 *  - Hotlinking `m.media-amazon.com/images/I/...` is widely tolerated but
 *    technically off-policy, and image URLs can change without warning.
 *  - Our catalog mixes verified ASINs with brand-targeted searches, so some
 *    tiles would always lack a product image — the UI looked janky as a
 *    result.
 *
 * Instead, each supplement gets a consistent category-driven gradient with
 * a chemistry-style monogram (Mg, D3, Ω3, etc.). Copyright-safe, zero
 * external requests, and more intentional-looking.
 */

export type SupplementCategory =
  | "vitamin"
  | "mineral"
  | "fatty-acid"
  | "amino"
  | "probiotic"
  | "other"

export type SupplementVisual = {
  /** 1–3 character monogram for the tile (e.g. "Mg", "D3", "Ω3"). */
  monogram: string
  /** CSS gradient string used as tile background. */
  gradient: string
  /** Light accent color (for subtle borders, glows, chips). */
  tint: string
  /** Text color for the monogram itself. */
  textColor: string
}

const CATEGORY_VISUALS: Record<SupplementCategory, Omit<SupplementVisual, "monogram">> = {
  vitamin: {
    gradient: "linear-gradient(135deg, #fbbf24 0%, #d97706 55%, #7c2d12 100%)",
    tint: "#fde68a",
    textColor: "#fff7ed",
  },
  mineral: {
    gradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 55%, #0c4a6e 100%)",
    tint: "#bae6fd",
    textColor: "#f0f9ff",
  },
  "fatty-acid": {
    gradient: "linear-gradient(135deg, #22d3ee 0%, #0891b2 55%, #083344 100%)",
    tint: "#a5f3fc",
    textColor: "#ecfeff",
  },
  amino: {
    gradient: "linear-gradient(135deg, #4ade80 0%, #16a34a 55%, #14532d 100%)",
    tint: "#bbf7d0",
    textColor: "#f0fdf4",
  },
  probiotic: {
    gradient: "linear-gradient(135deg, #f472b6 0%, #db2777 55%, #831843 100%)",
    tint: "#fbcfe8",
    textColor: "#fdf2f8",
  },
  other: {
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 55%, #4c1d95 100%)",
    tint: "#ddd6fe",
    textColor: "#f5f3ff",
  },
}

/**
 * Preset-specific monograms. When a preset isn't in this map we fall back to
 * the first 1–2 characters of the display name.
 */
const PRESET_MONOGRAMS: Record<string, string> = {
  vitamin_d: "D3",
  magnesium: "Mg",
  omega3: "Ω3",
  iron: "Fe",
  zinc: "Zn",
  creatine: "Cr",
  protein_powder: "Pro",
  b12: "B12",
  folate: "B9",
  fiber: "Fi",
  electrolytes: "E⁺",
  multivitamin: "MV",
  probiotic: "PB",
  calcium: "Ca",
  potassium: "K⁺",
  selenium: "Se",
  iodine: "I₂",
  chromium: "Ch",
  vitamin_c: "C",
  vitamin_k2: "K2",
  vitamin_e: "E",
  biotin: "B7",
  b_complex: "B",
  coq10: "Q10",
  collagen: "Co",
  melatonin: "Mel",
  ashwagandha: "Ash",
  turmeric: "Cu",
  l_theanine: "LT",
  bcaa: "BC",
  glutamine: "Gl",
  beta_alanine: "βA",
  citrulline: "Cit",
  nac: "NAC",
  berberine: "Be",
  prenatal: "Pn",
  greens_powder: "Gr",
}

/**
 * Biomarker name → preset id used when we only have a biomarker name (e.g. on
 * the priority card product thumb where we get an AffiliateProduct rather
 * than a catalog entry). Keys are normalized to lowercase.
 */
const BIOMARKER_TO_PRESET: Record<string, string> = {
  "vitamin d": "vitamin_d",
  "25-oh vitamin d": "vitamin_d",
  "ferritin": "iron",
  "iron": "iron",
  "tibc": "iron",
  "transferrin": "iron",
  "b12": "b12",
  "vitamin b12": "b12",
  "cobalamin": "b12",
  "folate": "folate",
  "magnesium": "magnesium",
  "omega-3 index": "omega3",
  "omega3": "omega3",
  "triglycerides": "omega3",
  "hs-crp": "turmeric",
  "crp": "turmeric",
  "ldl-c": "fiber",
  "ldl": "fiber",
  "non-hdl": "fiber",
  "apob": "fiber",
  "hba1c": "berberine",
  "a1c": "berberine",
  "fasting glucose": "berberine",
  "glucose": "berberine",
  "insulin": "berberine",
  "homa-ir": "berberine",
  "zinc": "zinc",
  "selenium": "selenium",
  "calcium": "calcium",
  "potassium": "potassium",
  "iodine": "iodine",
}

export function getSupplementVisualForPreset(presetId: string, category?: string): SupplementVisual {
  const cat = normalizeCategory(category)
  const base = CATEGORY_VISUALS[cat]
  const monogram = PRESET_MONOGRAMS[presetId] ?? fallbackMonogram(presetId)
  return { ...base, monogram }
}

export function getSupplementVisualForBiomarker(biomarkerName: string): SupplementVisual {
  const presetId = BIOMARKER_TO_PRESET[biomarkerName.trim().toLowerCase()]
  if (presetId) return getSupplementVisualForPreset(presetId)
  // Default neutral visual when we can't map the marker.
  return { ...CATEGORY_VISUALS.other, monogram: "Rx" }
}

function normalizeCategory(category: string | undefined): SupplementCategory {
  const c = (category ?? "other").toLowerCase()
  if (c === "vitamin" || c === "mineral" || c === "fatty-acid" || c === "amino" || c === "probiotic") {
    return c as SupplementCategory
  }
  return "other"
}

function fallbackMonogram(presetId: string): string {
  const cleaned = presetId.replace(/_/g, " ").trim()
  if (!cleaned) return "Rx"
  const first = cleaned[0]?.toUpperCase() ?? "R"
  const next = cleaned.split(" ")[1]?.[0]?.toUpperCase()
  return next ? `${first}${next}` : first
}
