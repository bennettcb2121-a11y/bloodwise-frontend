/**
 * Health score breakdown by category, score drivers (limiters), and improvement forecast.
 * Uses same penalty logic as calculateScore.ts.
 */

import { calculateScore } from "./calculateScore"
import {
  computeDriverPriorityScore,
  isPriorityContextEmpty,
  type UserPriorityContext,
} from "./priorityRanking"

export type { UserPriorityContext } from "./priorityRanking"

export type BiomarkerResultForScore = {
  name?: string
  status?: string
  value?: number
  optimalMin?: number | null
  optimalMax?: number | null
}

export const SCORE_CATEGORIES = [
  "Iron status",
  "Vitamin status",
  "Metabolic markers",
  "Lipids & cardiovascular",
  "Inflammation",
  "Electrolytes & minerals",
] as const

export type ScoreCategoryId = (typeof SCORE_CATEGORIES)[number]

/** Map biomarker name to category for breakdown. */
const BIOMARKER_TO_CATEGORY: Record<string, ScoreCategoryId> = {
  Ferritin: "Iron status",
  Hemoglobin: "Iron status",
  Hematocrit: "Iron status",
  RBC: "Iron status",
  MCV: "Iron status",
  MCH: "Iron status",
  RDW: "Iron status",
  "Vitamin D": "Vitamin status",
  "Vitamin B12": "Vitamin status",
  Folate: "Vitamin status",
  HbA1c: "Metabolic markers",
  Glucose: "Metabolic markers",
  "Fasting Glucose": "Metabolic markers",
  Insulin: "Metabolic markers",
  "LDL-C": "Lipids & cardiovascular",
  Triglycerides: "Lipids & cardiovascular",
  "HDL-C": "Lipids & cardiovascular",
  "Total cholesterol": "Lipids & cardiovascular",
  ApoB: "Lipids & cardiovascular",
  "hs-CRP": "Inflammation",
  CRP: "Inflammation",
  ESR: "Inflammation",
  Magnesium: "Electrolytes & minerals",
  Calcium: "Electrolytes & minerals",
  Sodium: "Electrolytes & minerals",
  Potassium: "Electrolytes & minerals",
  Chloride: "Electrolytes & minerals",
  CO2: "Electrolytes & minerals",
}

const DEFAULT_CATEGORY: ScoreCategoryId = "Electrolytes & minerals"

function getCategory(markerName: string): ScoreCategoryId {
  return BIOMARKER_TO_CATEGORY[markerName] ?? DEFAULT_CATEGORY
}

/** Get category for a biomarker (for section headers on Biomarkers page). */
export function getCategoryForMarker(markerName: string): ScoreCategoryId {
  const n = (markerName ?? "").trim()
  if (n === "25-OH Vitamin D") return "Vitamin status"
  return BIOMARKER_TO_CATEGORY[n] ?? DEFAULT_CATEGORY
}

/** Penalty points for score (deficient 18, low 12, suboptimal 8, high 10). Exported for Action Center "Impact: −X points". */
export function penaltyForStatus(status: string): number {
  const s = status.toLowerCase()
  if (s === "deficient") return 18
  if (s === "low") return 12
  if (s === "suboptimal") return 8
  if (s === "high") return 10
  return 0
}

export type ScoreBreakdownResult = {
  total: number
  breakdown: Record<ScoreCategoryId, number>
}

/** Compute total score and per-category scores. Categories with no markers default to 100. */
export function getScoreBreakdown(
  report: BiomarkerResultForScore[] = []
): ScoreBreakdownResult {
  const breakdown: Record<ScoreCategoryId, number> = {
    "Iron status": 100,
    "Vitamin status": 100,
    "Metabolic markers": 100,
    "Lipids & cardiovascular": 100,
    Inflammation: 100,
    "Electrolytes & minerals": 100,
  }

  const byCategory: Partial<Record<ScoreCategoryId, BiomarkerResultForScore[]>> = {}
  for (const item of report) {
    const name = item?.name ?? ""
    if (!name) continue
    const cat = getCategory(name)
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat]!.push(item)
  }

  for (const cat of SCORE_CATEGORIES) {
    const items = byCategory[cat] ?? []
    let score = 100
    for (const item of items) {
      score -= penaltyForStatus(String(item?.status ?? ""))
    }
    breakdown[cat] = Math.max(0, Math.round(score))
  }

  const total = calculateScore(report)
  return { total, breakdown }
}

export type ScoreDriver = {
  label: string
  markerName: string
  status: string
}

/** Top 3–5 limiters (deficient/suboptimal/high markers) that drag the score down. */
export function getScoreDrivers(
  report: BiomarkerResultForScore[] = [],
  maxItems: number = 5
): ScoreDriver[] {
  const statusToLabel: Record<string, string> = {
    deficient: "Low",
    suboptimal: "Borderline",
    high: "High",
    low: "Low",
  }
  const limiters = report
    .filter((item) => {
      const s = (item?.status ?? "").toLowerCase()
      return s === "deficient" || s === "suboptimal" || s === "high" || s === "low"
    })
    .map((item) => ({
      label: `${statusToLabel[(item.status ?? "").toLowerCase()] ?? item.status} ${item.name ?? ""}`.trim(),
      markerName: item.name ?? "",
      status: item.status ?? "",
    }))
    .slice(0, maxItems)
  return limiters
}

/** Drivers sorted by severity + optional profile/symptom/sport context for Action Center priority order. */
export function getOrderedScoreDrivers(
  report: BiomarkerResultForScore[] = [],
  maxItems: number = 10,
  priorityContext?: UserPriorityContext | null
): ScoreDriver[] {
  const statusToLabel: Record<string, string> = {
    deficient: "Low",
    suboptimal: "Borderline",
    high: "High",
    low: "Low",
  }
  const limiters = report
    .filter((item) => {
      const s = (item?.status ?? "").toLowerCase()
      return s === "deficient" || s === "suboptimal" || s === "high" || s === "low"
    })
    .map((item) => ({
      label: `${statusToLabel[(item.status ?? "").toLowerCase()] ?? item.status} ${item.name ?? ""}`.trim(),
      markerName: item.name ?? "",
      status: item.status ?? "",
    }))
  const useContext = priorityContext != null && !isPriorityContextEmpty(priorityContext)
  if (useContext) {
    limiters.sort(
      (a, b) =>
        computeDriverPriorityScore(b.markerName, b.status, report, priorityContext) -
        computeDriverPriorityScore(a.markerName, a.status, report, priorityContext)
    )
  } else {
    limiters.sort((a, b) => penaltyForStatus(b.status) - penaltyForStatus(a.status))
  }
  return limiters.slice(0, maxItems)
}

/** Estimate score if one marker were moved to optimal (re-run score with that marker forced optimal). */
export function getImprovementForecast(
  report: BiomarkerResultForScore[] = [],
  markerName: string
): { currentScore: number; projectedScore: number; markerName: string; currentValue?: number; targetValue?: number } | null {
  const currentScore = calculateScore(report)
  const item = report.find((r) => (r.name ?? "") === markerName)
  if (!item || !item.status || (item.status as string).toLowerCase() === "optimal") return null

  const simulated = report.map((r) =>
    (r.name ?? "") === markerName ? { ...r, status: "optimal" } : r
  )
  const projectedScore = calculateScore(simulated)
  if (projectedScore <= currentScore) return null

  return {
    currentScore,
    projectedScore,
    markerName,
    currentValue: item.value,
    targetValue: item.optimalMin ?? item.optimalMax ?? undefined,
  }
}
