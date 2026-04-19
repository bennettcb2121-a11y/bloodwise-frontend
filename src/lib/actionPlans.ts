/**
 * Personalized action plans per biomarker: daily actions, weekly actions, retest window.
 * Explicit PLANS for key markers; all other biomarkerDatabase entries get a synthesized plan from foods / lifestyle / supplements / whyItMatters.
 */

import { biomarkerDatabase } from "./biomarkerDatabase"
import { resolveActionPlanDbKey, ACTION_PLAN_KEY_ALIASES } from "./biomarkerAliases"
import { elevationTierForHighValue, type ElevationTier } from "./biomarkerElevation"
import type { UserProfile } from "./classifyUser"
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

export { ACTION_PLAN_KEY_ALIASES, resolveActionPlanDbKey }

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
 * When a nutrient is above target, do not recommend “take more” repletion steps.
 * Framing aligns with NIH ODS professional fact sheets (vitamin D, B12): elevated labs warrant
 * reducing excess intake and clinician review rather than adding supplements.
 */
function buildHighRepletionActionPlan(dbKey: string, tier: ElevationTier): Omit<ActionPlan, "retestWindow"> | null {
  const tierGeneric =
    tier === "mild"
      ? "Slightly above your Clarion band — review all inputs before adding supplements."
      : tier === "moderate"
        ? "Clearly above your target — prioritize clinician review and a clear retest plan."
        : "Markedly elevated — seek clinician guidance on interpretation; do not stack more supplements to compensate."

  switch (dbKey) {
    case "Vitamin D": {
      const dTier =
        tier === "mild"
          ? "Mild elevation — often from supplements or fortification; avoid extra vitamin D until reviewed."
          : tier === "moderate"
            ? "Moderate elevation — stop unsupervised supplementation; NIH ODS notes toxicity is usually linked to excess intake over time."
            : "Severe elevation — seek prompt clinician input; very high 25-OH vitamin D can associate with hypercalcemia (rare but serious)."
      return {
        biomarkerKey: "Vitamin D",
        dailyActions: [
          "Stop or reduce vitamin D supplements unless your clinician tells you otherwise (NIH ODS: toxicity is usually from excess intake over time).",
          "List all sources: multivitamins, D3, cod liver oil, fortified drinks — total intake matters.",
          dTier,
        ],
        weeklyActions: [
          "Retest 25-hydroxyvitamin D on the schedule your clinician recommends after any change.",
          "If you have nausea, confusion, excessive thirst, or kidney issues with a very high level, seek urgent care.",
        ],
        sourceGuideSlug: "vitamin-d",
      }
    }
    case "Vitamin B12":
      return {
        biomarkerKey: "Vitamin B12",
        dailyActions: [
          "Do not add more B12 supplements on your own — high serum B12 often reflects pills/injections you already take (NIH ODS: no defined UL; interpretation is clinical).",
          "If you are not supplementing and the level is high, your clinician may evaluate liver, kidney, or blood conditions — this is not something to “fix” with more B12.",
          tierGeneric,
        ],
        weeklyActions: [
          "Bring your full supplement list to your next visit.",
          "Retest as directed; avoid stacking multiple high-dose B12 products.",
        ],
        sourceGuideSlug: "b12-absorption",
      }
    case "Magnesium":
      return {
        biomarkerKey: "Magnesium",
        dailyActions: [
          "Stop magnesium supplements unless prescribed — high serum magnesium is uncommon from food alone in healthy kidneys; supplements are the usual suspect.",
          "If you take magnesium for sleep or cramps, ask your clinician before restarting.",
          tierGeneric,
        ],
        weeklyActions: [
          "Review kidney function and medications (e.g. PPIs, diuretics) with your clinician if levels stay high.",
          "Retest per clinician advice.",
        ],
        sourceGuideSlug: "magnesium-sleep",
      }
    case "Folate":
      return {
        biomarkerKey: "Folate",
        dailyActions: [
          "Avoid high-dose folic acid or folate stacks without guidance — excess can complicate interpretation of B12 status.",
          "Do not increase folate to “balance” other labs without clinician input.",
        ],
        weeklyActions: [
          "Review fortified foods and supplements with your clinician.",
          "Confirm B12 status if folate is high and symptoms persist.",
        ],
        sourceGuideSlug: null,
      }
    case "Ferritin":
      return {
        biomarkerKey: "Ferritin",
        dailyActions: [
          "Do not take iron supplements — high ferritin means iron stores are already elevated; more iron can be harmful.",
          "Avoid vitamin C megadoses aimed only at iron absorption unless your clinician advises.",
        ],
        weeklyActions: [
          "Discuss causes with your clinician (inflammation, hemochromatosis risk, alcohol, liver health).",
          "Retest iron indices and ferritin on their schedule.",
        ],
        sourceGuideSlug: "iron",
      }
    default:
      return null
  }
}

function buildGenericHighOutOfRangePlan(dbKey: string): Omit<ActionPlan, "retestWindow"> {
  return {
    biomarkerKey: dbKey,
    dailyActions: [
      `Your ${dbKey} is above your Clarion target — do not add supplements that push this marker higher without medical guidance.`,
      "Keep a stable routine until you review the result with your clinician.",
    ],
    weeklyActions: [
      "Note symptoms, medications, and training load that could affect interpretation.",
      "Retest on the schedule your clinician recommends.",
    ],
    sourceGuideSlug: null,
  }
}

export type ActionPlanOptions = {
  status?: string
  value?: number
  profile?: UserProfile | null
}

/**
 * Get the action plan for a biomarker. Uses explicit PLANS when present; otherwise builds from biomarkerDatabase.
 * When `options.status` is `high`, returns “review / don’t replete” steps for nutrient markers (D, B12, etc.).
 */
export function getActionPlanForBiomarker(
  biomarkerKey: string,
  analysisResults?: Array<{ name?: string; marker?: string; status?: string; value?: number }>,
  options?: ActionPlanOptions
): ActionPlan | null {
  const key = biomarkerKey.trim()
  const dbKey = resolveActionPlanDbKey(key)
  const status = (options?.status ?? "").toLowerCase()

  if (status === "high") {
    const tier: ElevationTier =
      options?.value != null && options?.profile
        ? elevationTierForHighValue(dbKey, options.value, options.profile)
        : "moderate"
    const highPlan = buildHighRepletionActionPlan(dbKey, tier) ?? buildGenericHighOutOfRangePlan(dbKey)
    let retestWindow = DEFAULT_RETEST
    if (analysisResults?.length) {
      const recs = getRetestRecommendations(analysisResults)
      const match = recs.find(
        (r) =>
          r.marker.toLowerCase() === key.toLowerCase() ||
          r.marker.toLowerCase() === dbKey.toLowerCase() ||
          key.toLowerCase().includes(r.marker.toLowerCase())
      )
      if (match) retestWindow = match.timing
    }
    const entry = biomarkerDatabase[dbKey]
    if (entry?.retest && !isPlaceholder(entry.retest) && retestWindow === DEFAULT_RETEST) {
      retestWindow = trimBullet(entry.retest, 80)
    }
    return {
      ...highPlan,
      retestWindow,
    }
  }

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
