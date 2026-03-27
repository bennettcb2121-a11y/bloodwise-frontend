/**
 * Personalized action plans per biomarker: daily actions, weekly actions, retest window.
 * Explicit PLANS for key markers; all other biomarkerDatabase entries get a synthesized plan from foods / lifestyle / supplements / whyItMatters.
 */

import { biomarkerDatabase } from "./biomarkerDatabase"
import { getRetestRecommendations } from "./retestEngine"
import { getGuidesForBiomarker } from "./guides"

export type ActionPlan = {
  biomarkerKey: string
  dailyActions: string[]
  weeklyActions: string[]
  retestWindow: string
  sourceGuideSlug: string | null
}

const PLANS: Record<string, Omit<ActionPlan, "retestWindow">> = {
  Ferritin: {
    biomarkerKey: "Ferritin",
    dailyActions: [
      "Take iron supplement (25–65 mg elemental iron as recommended)",
      "Pair with vitamin C (e.g. citrus, kiwi, or small supplement)",
      "Avoid coffee and tea within 1 hour of iron",
    ],
    weeklyActions: [
      "Eat iron-rich foods (red meat, lentils, beans, spinach) with vitamin C",
      "Monitor energy and symptoms",
    ],
    sourceGuideSlug: "iron",
  },
  "Vitamin D": {
    biomarkerKey: "Vitamin D",
    dailyActions: [
      "Take vitamin D3 supplement (dose per your protocol)",
      "Take with a meal for better absorption",
    ],
    weeklyActions: [
      "Include fatty fish, egg yolks, or fortified foods",
      "Get brief sun exposure when feasible",
    ],
    sourceGuideSlug: "vitamin-d",
  },
  "25-OH Vitamin D": {
    biomarkerKey: "25-OH Vitamin D",
    dailyActions: [
      "Take vitamin D3 supplement (dose per your protocol)",
      "Take with a meal for better absorption",
    ],
    weeklyActions: [
      "Include fatty fish, egg yolks, or fortified foods",
      "Get brief sun exposure when feasible",
    ],
    sourceGuideSlug: "vitamin-d",
  },
  "Vitamin B12": {
    biomarkerKey: "Vitamin B12",
    dailyActions: [
      "Take B12 supplement (e.g. 1,000 mcg oral or sublingual)",
      "Take with or without food (sublingual can be any time)",
    ],
    weeklyActions: [
      "Include animal sources if possible (shellfish, beef, salmon, eggs)",
      "Review PPI or metformin use with your clinician if levels stay low",
    ],
    sourceGuideSlug: "b12-absorption",
  },
  Magnesium: {
    biomarkerKey: "Magnesium",
    dailyActions: [
      "Take magnesium (glycinate or citrate as recommended)",
      "Consider evening dose for sleep support",
    ],
    weeklyActions: [
      "Eat magnesium-rich foods (nuts, seeds, leafy greens, dark chocolate)",
      "Limit alcohol and manage stress",
    ],
    sourceGuideSlug: "magnesium-sleep",
  },
  Folate: {
    biomarkerKey: "Folate",
    dailyActions: [
      "Take folate or methylfolate (5-MTHF) if recommended",
      "Do not exceed 1,000 mcg folic acid without clinician guidance",
    ],
    weeklyActions: [
      "Eat leafy greens, lentils, beans, asparagus, avocado",
      "Confirm B12 status if folate is low",
    ],
    sourceGuideSlug: null,
  },
}

const DEFAULT_RETEST = "8–12 weeks"

/** Panel / lab label → biomarkerDatabase key */
export const ACTION_PLAN_KEY_ALIASES: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "Fasting Glucose": "Glucose",
  "Fasting insulin": "Insulin",
}

export function resolveActionPlanDbKey(markerName: string): string {
  const t = markerName.trim()
  return ACTION_PLAN_KEY_ALIASES[t] ?? t
}

function isPlaceholder(text: string): boolean {
  const s = text.trim()
  return s === "" || s === "—" || s === "-" || s === "–"
}

function trimBullet(s: string, max = 240): string {
  const x = s.trim()
  if (x.length <= max) return x
  return `${x.slice(0, max - 1).trim()}…`
}

/** Split prose into short actionable lines */
function toBulletLines(text: string | undefined, maxLines: number): string[] {
  if (!text || isPlaceholder(text)) return []
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !isPlaceholder(p))
  return raw.slice(0, maxLines).map((p) => trimBullet(p.replace(/\s+/g, " ")))
}

function buildPlanFromDatabase(markerKey: string): Omit<ActionPlan, "retestWindow"> | null {
  const dbKey = resolveActionPlanDbKey(markerKey)
  const entry = biomarkerDatabase[dbKey]
  if (!entry) return null

  const daily: string[] = []
  const weekly: string[] = []

  const supp = toBulletLines(entry.supplementNotes, 4)
  const foods = toBulletLines(entry.foods, 5)
  const life = toBulletLines(entry.lifestyle, 5)

  daily.push(...supp.slice(0, 3))
  if (daily.length < 2) {
    daily.push(...foods.slice(0, 3 - daily.length))
  }
  if (daily.length === 0 && entry.whyItMatters && !isPlaceholder(entry.whyItMatters)) {
    const first = entry.whyItMatters.split(/(?<=[.!?])\s+/)[0]?.trim()
    if (first && first.length > 15) daily.push(trimBullet(first))
  }
  if (daily.length === 0) {
    daily.push(`Review ${dbKey} with your clinician using your latest result and symptoms.`)
  }

  weekly.push(...life.slice(0, 3))
  const foodRest = foods.slice(Math.max(0, 3 - supp.length))
  weekly.push(...foodRest.slice(0, 3))
  if (weekly.length === 0 && entry.foods && !isPlaceholder(entry.foods)) {
    weekly.push(trimBullet(entry.foods))
  }
  if (weekly.length === 0 && entry.lifestyle && !isPlaceholder(entry.lifestyle)) {
    weekly.push(trimBullet(entry.lifestyle))
  }
  if (weekly.length === 0 && entry.retest && !isPlaceholder(entry.retest)) {
    weekly.push(`Retesting: ${trimBullet(entry.retest, 200)}`)
  }
  if (weekly.length === 0) {
    weekly.push("Keep a stable routine, note symptoms, and retest on the schedule your clinician recommends.")
  }

  const guides = getGuidesForBiomarker(markerKey)
  const guideFromMarker = guides[0]?.slug
  const guidesDb = getGuidesForBiomarker(dbKey)
  const sourceGuideSlug = guideFromMarker ?? guidesDb[0]?.slug ?? null

  return {
    biomarkerKey: dbKey,
    dailyActions: daily.slice(0, 4),
    weeklyActions: weekly.slice(0, 4),
    sourceGuideSlug,
  }
}

/**
 * Get the action plan for a biomarker. Uses explicit PLANS when present; otherwise builds from biomarkerDatabase.
 * Every database marker gets a non-null plan when the key resolves.
 */
export function getActionPlanForBiomarker(
  biomarkerKey: string,
  analysisResults?: Array<{ name?: string; marker?: string }>
): ActionPlan | null {
  const key = biomarkerKey.trim()
  const base = PLANS[key] ?? buildPlanFromDatabase(key)
  if (!base) return null

  let retestWindow = DEFAULT_RETEST
  if (analysisResults?.length) {
    const recs = getRetestRecommendations(analysisResults)
    const match = recs.find(
      (r) =>
        r.marker.toLowerCase() === key.toLowerCase() ||
        key.toLowerCase().includes(r.marker.toLowerCase())
    )
    if (match) retestWindow = match.timing
  }

  const entry = biomarkerDatabase[resolveActionPlanDbKey(key)]
  if (entry?.retest && !isPlaceholder(entry.retest) && retestWindow === DEFAULT_RETEST) {
    retestWindow = trimBullet(entry.retest, 80)
  }

  return {
    ...base,
    retestWindow,
  }
}

/**
 * Get guide slug for "View full guide" — explicit plan first, then guides index.
 */
export function getActionPlanGuideSlug(biomarkerKey: string): string | null {
  const key = biomarkerKey.trim()
  const explicit = PLANS[key]?.sourceGuideSlug
  if (explicit) return explicit
  const guides = getGuidesForBiomarker(key)
  if (guides[0]?.slug) return guides[0].slug
  const dbKey = resolveActionPlanDbKey(key)
  return getGuidesForBiomarker(dbKey)[0]?.slug ?? null
}
