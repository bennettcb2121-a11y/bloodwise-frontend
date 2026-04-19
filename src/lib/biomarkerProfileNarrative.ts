/**
 * Short, profile-aware copy for each tested marker: what it is, why it matters for this user,
 * and whether the current value fits their stated goals and training.
 */

import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import { resolveBloodworkToDbKey } from "@/src/lib/biomarkerAliases"
import { HEALTH_GOAL_OPTIONS, parseHealthGoalIds } from "@/src/lib/clarionProfiles"
import { inferWhyItMatters } from "@/src/lib/priorityEngine"
import { classifyUser } from "@/src/lib/classifyUser"

export type BiomarkerProfileNarrative = {
  /** Plain-language: what this lab measures (1–2 sentences max). */
  whatItIs: string
  /** Why this marker matters given sport, goals, and optional symptoms. */
  whyForYou: string
  /** Whether this result is “good” for what they want, given Clarion status. */
  fitForGoals: string
}

function dbKeyForMarker(markerDisplayName: string): string {
  const raw = markerDisplayName.trim()
  if (raw === "25-OH Vitamin D") return "Vitamin D"
  return resolveBloodworkToDbKey(raw)
}

function truncateSentences(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  const cut = t.slice(0, maxChars)
  const lastPeriod = cut.lastIndexOf(".")
  if (lastPeriod > 40) return cut.slice(0, lastPeriod + 1).trim()
  return `${cut.trim()}…`
}

function trainingPhrase(profile: ProfileRow | null): string {
  const c = classifyUser({
    age: profile?.age,
    sex: profile?.sex,
    sport: profile?.sport ?? "",
    training_focus: profile?.training_focus ?? null,
  })
  switch (c.userClass) {
    case "endurance":
      return "endurance and aerobic work"
    case "strength":
      return "strength and power training"
    case "mixed":
      return "mixed or hybrid training"
    default:
      return "your training and day-to-day health"
  }
}

function goalsPhrase(profile: ProfileRow | null): string {
  if (!profile) return "what you want to improve"
  const goal = profile.goal?.trim()
  if (goal) return goal.charAt(0).toLowerCase() + goal.slice(1)

  const ids = parseHealthGoalIds(profile.health_goals)
  if (ids.length > 0) {
    const labels = ids
      .map((id) => HEALTH_GOAL_OPTIONS.find((o) => o.id === id)?.label)
      .filter((x): x is string => Boolean(x))
    if (labels.length === 1) return labels[0].toLowerCase()
    if (labels.length === 2) return `${labels[0].toLowerCase()} and ${labels[1].toLowerCase()}`
    if (labels.length > 2) return `${labels.slice(0, -1).map((l) => l.toLowerCase()).join(", ")}, and ${labels[labels.length - 1]!.toLowerCase()}`
  }

  const pt = profile.profile_type?.replace(/_/g, " ").trim()
  if (pt) return pt

  return "your health goals"
}

function symptomLead(profile: ProfileRow | null): string | null {
  const raw = profile?.symptoms?.trim()
  if (!raw || raw === "none") return null
  const first = raw.split(",")[0]?.trim().replace(/_/g, " ")
  if (!first) return null
  return `With ${first} in the mix,`
}

/**
 * Build narrative blocks for a single analyzed marker and the user’s profile.
 */
export function getBiomarkerProfileNarrative(
  markerDisplayName: string,
  result: BiomarkerResult,
  profile: ProfileRow | null
): BiomarkerProfileNarrative {
  const key = dbKeyForMarker(markerDisplayName)
  const entry = biomarkerDatabase[key]
  const status = (result.status ?? "").toLowerCase()

  const baseDescription =
    (result.description?.trim() && status !== "unknown" ? result.description : null) ||
    entry?.description ||
    `${markerDisplayName} is a lab value on your panel.`

  const whatItIs = truncateSentences(baseDescription, 320)

  const whyCore = (result.whyItMatters?.trim() || entry?.whyItMatters || inferWhyItMatters(markerDisplayName)).trim()
  const whyFirst = (() => {
    const t = whyCore.trim()
    const i = t.indexOf(".")
    if (i === -1) return t.endsWith(".") ? t : `${t}.`
    return t.slice(0, i + 1).trim()
  })()
  const training = trainingPhrase(profile)
  const goals = goalsPhrase(profile)
  const symptom = symptomLead(profile)

  const whyForYou = symptom
    ? `${symptom} ${whyFirst} That ties to ${training} and ${goals}.`
    : `${whyFirst} That ties to ${training} and ${goals}.`

  let fitForGoals: string
  if (status === "unknown") {
    fitForGoals =
      "Clarion can’t match this label to our library yet—double-check the spelling on your lab PDF, then we can score it and personalize this section."
  } else if (status === "optimal" || status === "normal" || status === "in range") {
    fitForGoals = `Relative to your Clarion target and what you’ve shared (${goals}), this looks supportive right now—keep the habits that got you here and retest on your usual schedule.`
  } else if (status === "suboptimal") {
    fitForGoals = `For ${training} and ${goals}, this is slightly off your Clarion target—often fixable with lifestyle levers first; use this as a conversation starter with your clinician, not a self-diagnosis.`
  } else if (status === "deficient" || status === "low") {
    fitForGoals = `For what you want to do, this is below where Clarion would like it—worth prioritizing with your clinician so any change (food, training load, or meds) is intentional and safe.`
  } else if (status === "high") {
    fitForGoals = `For your goals, this sits above your Clarion target—some causes are benign and some need medical context; confirm interpretation before changing supplements or training sharply.`
  } else {
    fitForGoals = `Review this marker with your clinician alongside ${goals} and the rest of your panel.`
  }

  return {
    whatItIs,
    whyForYou: truncateSentences(whyForYou, 420),
    fitForGoals,
  }
}
