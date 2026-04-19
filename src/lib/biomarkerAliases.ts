/**
 * Map common lab report labels → biomarkerDatabase keys so scoring and ranges stay consistent.
 */

export const BLOODWORK_KEY_TO_DB_KEY: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "25-Hydroxyvitamin D": "Vitamin D",
  "25 OH Vitamin D": "Vitamin D",
}

export function resolveBloodworkToDbKey(markerName: string): string {
  return BLOODWORK_KEY_TO_DB_KEY[markerName] ?? markerName
}

/** Panel / UI label → biomarkerDatabase key (action plans, drivers, affiliates). */
export const ACTION_PLAN_KEY_ALIASES: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "Fasting Glucose": "Glucose",
  "Fasting insulin": "Insulin",
}

export function resolveActionPlanDbKey(markerName: string): string {
  const t = markerName.trim()
  return ACTION_PLAN_KEY_ALIASES[t] ?? t
}
