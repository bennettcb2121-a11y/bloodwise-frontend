/**
 * Long-term health insight strings for dashboard and guide footer.
 * Educational only; no outcome promises.
 */

/** Keyed by biomarker (e.g. Ferritin, Vitamin D). One "why this matters long-term" line per marker. */
export const LONG_TERM_INSIGHTS: Record<string, string> = {
  Ferritin:
    "Maintaining ferritin in a healthy range may support endurance, cognitive performance, and energy over time.",
  "Vitamin D":
    "Vitamin D between 40–60 ng/mL is associated with better immune health and bone support in many studies.",
  "25-OH Vitamin D":
    "Vitamin D between 40–60 ng/mL is associated with better immune health and bone support in many studies.",
  "Vitamin B12":
    "Adequate B12 supports red blood cell health and nervous system function long-term.",
  Folate:
    "Folate and B12 work together for blood and homocysteine; keeping both in range supports cardiovascular and cognitive health.",
  Magnesium:
    "Adequate magnesium may support sleep, recovery, and muscle function over the long term.",
  "hs-CRP":
    "Keeping inflammation in check may support recovery and long-term wellness.",
  CRP:
    "Keeping inflammation in check may support recovery and long-term wellness.",
}

/**
 * Get a long-term insight for a biomarker. Returns null if none defined.
 */
export function getLongTermInsight(biomarkerKey: string): string | null {
  const key = biomarkerKey.trim()
  return LONG_TERM_INSIGHTS[key] ?? LONG_TERM_INSIGHTS[biomarkerKey] ?? null
}

/**
 * Get one long-term insight for the first priority biomarker from the list (for dashboard tip/rotation).
 */
export function getLongTermInsightForPriorities(priorityNames: string[]): string | null {
  for (const name of priorityNames) {
    const insight = getLongTermInsight(name)
    if (insight) return insight
  }
  return null
}
