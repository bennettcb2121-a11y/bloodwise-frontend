/**
 * Personalized action plans per biomarker: daily actions, weekly actions, retest window.
 * Used on guide pages and dashboard priority cards to feel like a protocol engine.
 */

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

/**
 * Get the action plan for a biomarker. Uses retest engine for retest window when available.
 */
export function getActionPlanForBiomarker(
  biomarkerKey: string,
  analysisResults?: Array<{ name?: string; marker?: string }>
): ActionPlan | null {
  const key = biomarkerKey.trim()
  const base = PLANS[key] ?? PLANS[biomarkerKey.replace("25-OH ", "Vitamin D")]
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

  return {
    ...base,
    retestWindow,
  }
}

/**
 * Get guide slug for "View full guide" link when plan has a source guide.
 */
export function getActionPlanGuideSlug(biomarkerKey: string): string | null {
  const plan = PLANS[biomarkerKey.trim()] ?? null
  if (plan?.sourceGuideSlug) return plan.sourceGuideSlug
  const guides = getGuidesForBiomarker(biomarkerKey)
  return guides[0]?.slug ?? null
}
