/**
 * Central helper for biomarker interpretation and next step.
 * Used by Biomarkers page, Actions, and insight views so every flagged marker
 * has a consistent headline, body, and next action.
 */

import { biomarkerDatabase } from "./biomarkerDatabase"
import { getBiomarkerContext, type ProfileContext } from "./biomarkerContext"
import { getNextStepForMarker, type NextStepType } from "./biomarkerNextSteps"
import { inferWhyItMatters } from "./priorityEngine"

export type InterpretationResult = {
  headline: string
  body: string
  nextStepType: NextStepType
  nextStepCopy: string
}

function normalizeMarkerForDb(name: string): string {
  const n = name.trim()
  if (n === "25-OH Vitamin D") return "Vitamin D"
  if (n === "Fasting Glucose") return "Glucose"
  return n
}

/**
 * Return a short headline, body, and next step for a biomarker given its status.
 * Uses biomarkerDatabase for description/whyItMatters, optional context for "why yours might be," and biomarkerNextSteps for the action.
 */
export function getInterpretationForMarker(
  markerName: string,
  status: string,
  profile?: ProfileContext | null
): InterpretationResult {
  const key = normalizeMarkerForDb(markerName)
  const entry = biomarkerDatabase[key]
  const next = getNextStepForMarker(markerName)
  const lower = (status ?? "").toLowerCase()

  if (lower === "unknown") {
    return {
      headline: `${markerName} isn’t recognized in Clarion’s library yet.`,
      body:
        "We can’t score or interpret this label automatically. Check spelling against your lab report, or use a supported marker name when you enter results.",
      nextStepType: "clinician",
      nextStepCopy: "Verify the marker name with your lab or clinician.",
    }
  }

  if (lower === "optimal" || lower === "normal" || lower === "in range") {
    const headline = `${markerName} is in a good range.`
    const body = entry?.description
      ? `${entry.description.split(".")[0]}. No action needed.`
      : "No action needed. Keep up your current habits and retest on schedule."
    return {
      headline,
      body,
      nextStepType: next.nextStepType,
      nextStepCopy: "No action needed. Retest on schedule.",
    }
  }

  if (lower === "deficient" || lower === "low") {
    const why = entry?.whyItMatters ?? inferWhyItMatters(markerName)
    const contextList = getBiomarkerContext(markerName, "low", profile)
    const contextLine =
      contextList.length > 0
        ? ` Possible contributors: ${contextList.slice(0, 2).join("; ")}.`
        : ""
    const headline = `${markerName} is low.`
    const body = `${why.split(".")[0]}.${contextLine} ${next.nextStepCopy}`
    return {
      headline,
      body,
      nextStepType: next.nextStepType,
      nextStepCopy: next.nextStepCopy,
    }
  }

  if (lower === "high") {
    const why = entry?.whyItMatters ?? inferWhyItMatters(markerName)
    const contextList = getBiomarkerContext(markerName, "high", profile)
    const contextLine =
      contextList.length > 0
        ? ` Possible contributors: ${contextList.slice(0, 2).join("; ")}.`
        : ""
    const headline = `${markerName} is high.`
    const body = `${why.split(".")[0]}.${contextLine} ${next.nextStepCopy}`
    return {
      headline,
      body,
      nextStepType: next.nextStepType,
      nextStepCopy: next.nextStepCopy,
    }
  }

  // suboptimal / borderline
  const why = entry?.whyItMatters ?? inferWhyItMatters(markerName)
  const contextList = getBiomarkerContext(markerName, "low", profile)
  const contextLine =
    contextList.length > 0
      ? ` Possible contributors: ${contextList.slice(0, 2).join("; ")}.`
      : ""
  const headline = `${markerName} is borderline.`
  const body = `${why.split(".")[0]}.${contextLine} ${next.nextStepCopy}`
  return {
    headline,
    body,
    nextStepType: next.nextStepType,
    nextStepCopy: next.nextStepCopy,
  }
}
