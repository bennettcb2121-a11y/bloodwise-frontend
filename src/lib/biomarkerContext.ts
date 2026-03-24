/**
 * Contextual "why yours might be low" (or high) based on profile and optional supplements.
 * Used in biomarker insight and guide views.
 */

export type ProfileContext = {
  diet_preference?: string | null
  sport?: string | null
  sex?: string | null
  improvement_preference?: string | null
  current_supplements?: string | null
}

/** Possible contributors keyed by biomarker (normalized name). */
const CONTEXT_BY_MARKER: Record<
  string,
  { low?: string[]; high?: string[]; profileConditions?: (keyof ProfileContext)[] }
> = {
  ferritin: {
    low: [
      "Low red meat or heme iron intake",
      "Heavy training or endurance sport",
      "Low vitamin C with plant iron",
      "Coffee or tea with meals",
      "Blood loss (menstrual, GI)",
      "Poor absorption",
    ],
    profileConditions: ["diet_preference", "sport"],
  },
  "vitamin d": {
    low: ["Limited sun exposure", "Winter or northern latitude", "Darker skin", "Low dietary intake"],
    high: ["High-dose supplementation without retest"],
    profileConditions: [],
  },
  "vitamin b12": {
    low: [
      "Low animal food intake",
      "Vegan or vegetarian diet",
      "PPI or metformin use",
      "GI absorption issues",
    ],
    profileConditions: ["diet_preference"],
  },
  folate: {
    low: ["Low leafy green or fortified grain intake", "Alcohol use", "Certain medications"],
    profileConditions: ["diet_preference"],
  },
  magnesium: {
    low: ["Low intake of nuts, seeds, greens", "Heavy sweating", "Alcohol", "Stress"],
    high: ["Kidney dysfunction", "Excess supplementation"],
    profileConditions: ["sport"],
  },
  "hs-crp": {
    high: ["Acute illness", "Injury", "Chronic inflammation", "Poor recovery"],
    profileConditions: ["sport"],
  },
}

function normalizeMarker(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim().replace(/-/g, "-")
}

/**
 * Return possible contributors for a biomarker being low or high.
 * Optionally filters by profile (e.g. if vegetarian, emphasize diet contributors).
 */
export function getBiomarkerContext(
  markerName: string,
  direction: "low" | "high",
  profile?: ProfileContext | null
): string[] {
  const key = normalizeMarker(markerName).replace("25-oh ", "")
  const entry = CONTEXT_BY_MARKER[key] ?? CONTEXT_BY_MARKER[markerName.toLowerCase()]

  if (!entry) return []

  const list = direction === "low" ? entry.low ?? [] : entry.high ?? []
  if (!profile || !entry.profileConditions?.length) return list.slice(0, 4)

  const diet = (profile.diet_preference ?? "").toLowerCase()
  const sport = (profile.sport ?? "").toLowerCase()
  const out: string[] = []

  if (diet.includes("vegetarian") || diet.includes("vegan")) {
    if (key.includes("ferritin") || key.includes("iron")) out.push("Vegetarian diets often reduce iron intake")
    if (key.includes("b12")) out.push("B12 is harder to get from plant foods alone")
  }
  if (sport.includes("run") || sport.includes("endurance") || sport.includes("athlete")) {
    if (key.includes("ferritin")) out.push("Heavy training can increase iron needs")
    if (key.includes("magnesium")) out.push("Sweat and stress can deplete magnesium")
  }

  for (const c of list) {
    if (!out.includes(c)) out.push(c)
  }
  return out.slice(0, 5)
}
