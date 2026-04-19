/**
 * Plain-language explanation of how Clarion derives “your” target bands for the analysis report.
 */

import { classifyUser, type UserProfile } from "@/src/lib/classifyUser"

const TRAINING_LABEL: Record<string, string> = {
  endurance: "endurance-style training",
  strength: "strength- and power-focused training",
  mixed: "mixed or team-sport training",
  general: "general health and activity",
}

export function buildAdaptiveRangeBullets(profile: UserProfile | null | undefined): string[] {
  const p = profile ?? {}
  const c = classifyUser({
    age: p.age,
    sex: p.sex,
    sport: p.sport,
    volume: p.volume,
    diet: p.diet,
  })
  const training = TRAINING_LABEL[c.userClass] ?? TRAINING_LABEL.general

  const bullets: string[] = [
    `Your Clarion targets come from our marker library, tuned to ${training} when that marker has sport-specific bands.`,
  ]

  if (c.sex === "female" || c.sex === "male") {
    bullets.push("Sex-specific bands apply wherever we define them in the library, so “target” matches that context.")
  }

  if (c.ageGroup === "masters") {
    bullets.push("Some markers add a masters band when the library includes age-adjusted targets.")
  } else if (c.ageGroup === "adolescent") {
    bullets.push("Adolescent bands apply only where the library defines them.")
  }

  bullets.push(
    "Education only: Clarion targets help you prioritize—they don’t replace your lab’s reference interval or your clinician’s judgment."
  )

  return bullets
}
