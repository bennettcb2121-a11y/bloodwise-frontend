import { biomarkerDatabase, type BiomarkerRange } from "./biomarkerDatabase"
import { classifyUser, type UserProfile } from "./classifyUser"

type BloodworkInput = {
  [key: string]: string | number
}

export type BiomarkerResult = {
  name: string
  value: number
  optimalMin: number | null
  optimalMax: number | null
  status: "deficient" | "suboptimal" | "optimal" | "high"
  description: string
  whyItMatters?: string
  foods?: string
  lifestyle?: string
  supplementNotes?: string
  retest?: string
  recommendedTests?: string[]
  researchSummary?: string
}

function mergeRanges(base: BiomarkerRange, override?: Partial<BiomarkerRange>): BiomarkerRange {
  return {
    ...base,
    ...(override || {}),
  }
}

function getAdaptiveRange(markerName: string, profile: UserProfile): BiomarkerRange | null {
  const entry = biomarkerDatabase[markerName]
  if (!entry) return null

  const classified = classifyUser(profile)

  let range = entry.ranges.general

  if (classified.userClass === "endurance" && entry.ranges.endurance) {
    range = entry.ranges.endurance
  } else if (classified.userClass === "strength" && entry.ranges.strength) {
    range = entry.ranges.strength
  } else if (classified.userClass === "mixed" && entry.ranges.mixed) {
    range = entry.ranges.mixed
  }

  if (classified.sex === "female" && entry.ranges.female) {
    range = mergeRanges(range, entry.ranges.female)
  } else if (classified.sex === "male" && entry.ranges.male) {
    range = mergeRanges(range, entry.ranges.male)
  }

  if (classified.ageGroup === "adolescent" && entry.ranges.adolescent) {
    range = mergeRanges(range, entry.ranges.adolescent)
  } else if (classified.ageGroup === "masters" && entry.ranges.masters) {
    range = mergeRanges(range, entry.ranges.masters)
  }

  return range
}

/** Returns athlete/profile-specific optimal range for display (e.g. lab input step). */
export function getDisplayRange(
  markerName: string,
  profile: UserProfile
): { optimalMin: number; optimalMax: number } | null {
  const range = getAdaptiveRange(markerName, profile)
  if (!range) return null
  return { optimalMin: range.optimalMin, optimalMax: range.optimalMax }
}

function getStatus(value: number, range: BiomarkerRange): BiomarkerResult["status"] {
  if (typeof range.deficient === "number" && value < range.deficient) {
    return "deficient"
  }

  if (typeof range.suboptimalMin === "number" && value < range.optimalMin) {
    return "suboptimal"
  }

  if (value > range.optimalMax) {
    return "high"
  }

  return "optimal"
}

export function analyzeBiomarkers(
  bloodwork: BloodworkInput = {},
  profile: UserProfile = {}
): BiomarkerResult[] {
  const results: BiomarkerResult[] = []

  Object.entries(bloodwork).forEach(([markerName, rawValue]) => {
    if (rawValue === "" || rawValue === null || rawValue === undefined) return

    const numericValue = Number(rawValue)
    if (Number.isNaN(numericValue)) return

    const entry = biomarkerDatabase[markerName]

    if (!entry) {
      results.push({
        name: markerName,
        value: numericValue,
        optimalMin: null,
        optimalMax: null,
        status: "optimal",
        description: "No biomarker description available.",
      })
      return
    }

    const adaptiveRange = getAdaptiveRange(markerName, profile)

    if (!adaptiveRange) {
      results.push({
        name: markerName,
        value: numericValue,
        optimalMin: null,
        optimalMax: null,
        status: "optimal",
        description: entry.description,
        whyItMatters: entry.whyItMatters,
        foods: entry.foods,
        lifestyle: entry.lifestyle,
        supplementNotes: entry.supplementNotes,
        retest: entry.retest,
        recommendedTests: entry.recommendedTests,
        researchSummary: entry.researchSummary,
      })
      return
    }

    results.push({
      name: markerName,
      value: numericValue,
      optimalMin: adaptiveRange.optimalMin,
      optimalMax: adaptiveRange.optimalMax,
      status: getStatus(numericValue, adaptiveRange),
      description: entry.description,
      whyItMatters: entry.whyItMatters,
      foods: entry.foods,
      lifestyle: entry.lifestyle,
      supplementNotes: entry.supplementNotes,
      retest: entry.retest,
      recommendedTests: entry.recommendedTests,
      researchSummary: entry.researchSummary,
    })
  })

  return results
}