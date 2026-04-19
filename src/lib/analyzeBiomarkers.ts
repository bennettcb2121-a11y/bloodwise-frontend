import { biomarkerDatabase, type BiomarkerRange } from "./biomarkerDatabase"
import { resolveBloodworkToDbKey } from "./biomarkerAliases"
import { classifyUser, type ClassifiedUser, type UserProfile } from "./classifyUser"

type BloodworkInput = {
  [key: string]: string | number
}

export type BiomarkerResult = {
  name: string
  value: number
  optimalMin: number | null
  optimalMax: number | null
  status: "deficient" | "suboptimal" | "optimal" | "high" | "unknown"
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
  const dbKey = resolveBloodworkToDbKey(markerName)
  const entry = biomarkerDatabase[dbKey]
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

/** Adaptive range for a marker name (supports bloodwork label aliases like 25-OH Vitamin D → Vitamin D). */
export function getAdaptiveRangeForMarker(markerName: string, profile: UserProfile): BiomarkerRange | null {
  return getAdaptiveRange(markerName, profile)
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

  // e.g. HbA1c: normal < elevatedMin, prediabetes [elevatedMin, highMin), diabetes >= highMin
  if (typeof range.elevatedMin === "number" && typeof range.highMin === "number") {
    if (value >= range.highMin) return "high"
    if (value >= range.elevatedMin) return "suboptimal"
    if (value >= range.optimalMin && value < range.elevatedMin) return "optimal"
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

    const dbKey = resolveBloodworkToDbKey(markerName)
    const entry = biomarkerDatabase[dbKey]

    if (!entry) {
      results.push({
        name: markerName,
        value: numericValue,
        optimalMin: null,
        optimalMax: null,
        status: "unknown",
        description:
          "This label isn’t in Clarion’s library yet, so we can’t score or interpret it. Use the exact marker name from your lab or add it when supported.",
      })
      return
    }

    const adaptiveRange = getAdaptiveRange(dbKey, profile)

    if (!adaptiveRange) {
      results.push({
        name: markerName,
        value: numericValue,
        optimalMin: null,
        optimalMax: null,
        status: "unknown",
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

export type RangeTier = {
  /** null = open on the low end (−∞) */
  from: number | null
  /** null = open on the high end (+∞) */
  to: number | null
  tone: "deficient" | "suboptimal" | "optimal" | "high"
}

export type RangeComparison = {
  marker: string
  value: number
  standardMin: number | null
  standardMax: number | null
  personalMin: number | null
  personalMax: number | null
  /** Wider typical US clinical lab reference interval, when the library publishes one. */
  labReferenceMin: number | null
  labReferenceMax: number | null
  labReferenceSource: string | null
  /** Clarion tier segments (deficient/suboptimal/optimal/high) derived from the general band. */
  standardTiers: RangeTier[]
  /** true when personal range differs meaningfully from standard (>5% shift on either bound) */
  isPersonalized: boolean
  /** Relationship between value / standard range / personal range. */
  mismatch:
    | "standard_optimal_personal_low"
    | "standard_optimal_personal_high"
    | "standard_flagged_personal_ok"
    | "aligned_in_range"
    | "aligned_high"
    | "aligned_low"
    | "unknown"
  /** e.g. "runner", "female adult", "masters athlete" — what narrative to show */
  profileLabel: string
  /** Plain-English one-sentence verdict for the analysis report card. */
  verdict: string
  /** true when the verdict describes a flagged/actionable situation (used for emphasis). */
  verdictIsFlagged: boolean
}

/**
 * Walk a BiomarkerRange's thresholds and emit an ordered list of tier segments
 * covering (−∞, +∞). Unbounded ends use `null`. Supports ADA-style bands when
 * both `elevatedMin` and `highMin` are defined.
 */
export function getRangeTiers(range: BiomarkerRange): RangeTier[] {
  const tiers: RangeTier[] = []
  const ada = typeof range.elevatedMin === "number" && typeof range.highMin === "number"

  if (ada) {
    if (typeof range.deficient === "number" && range.deficient < range.optimalMin) {
      tiers.push({ from: null, to: range.deficient, tone: "deficient" })
      tiers.push({ from: range.deficient, to: range.optimalMin, tone: "suboptimal" })
    } else {
      tiers.push({ from: null, to: range.optimalMin, tone: "suboptimal" })
    }
    tiers.push({ from: range.optimalMin, to: range.elevatedMin as number, tone: "optimal" })
    tiers.push({
      from: range.elevatedMin as number,
      to: range.highMin as number,
      tone: "suboptimal",
    })
    tiers.push({ from: range.highMin as number, to: null, tone: "high" })
    return tiers
  }

  const low = range.optimalMin
  const high = range.optimalMax

  if (typeof range.deficient === "number" && range.deficient < low) {
    tiers.push({ from: null, to: range.deficient, tone: "deficient" })
    tiers.push({ from: range.deficient, to: low, tone: "suboptimal" })
  } else {
    tiers.push({ from: null, to: low, tone: "suboptimal" })
  }

  tiers.push({ from: low, to: high, tone: "optimal" })

  if (typeof range.high === "number" && range.high > high) {
    tiers.push({ from: high, to: range.high, tone: "suboptimal" })
    tiers.push({ from: range.high, to: null, tone: "high" })
  } else {
    tiers.push({ from: high, to: null, tone: "high" })
  }

  return tiers
}

function boundShifted(standard: number, personal: number): boolean {
  if (standard === personal) return false
  if (standard === 0) return Math.abs(personal - standard) > 0.001
  return Math.abs(personal - standard) / Math.abs(standard) > 0.05
}

function buildProfileLabel(classified: ClassifiedUser, profile: UserProfile): string {
  const parts: string[] = []

  if (classified.ageGroup === "masters") parts.push("masters")
  else if (classified.ageGroup === "adolescent") parts.push("adolescent")

  if (classified.sex === "female" || classified.sex === "male") parts.push(classified.sex)

  if (classified.userClass === "endurance") parts.push("endurance athlete")
  else if (classified.userClass === "strength") parts.push("strength athlete")
  else if (classified.userClass === "mixed") parts.push("mixed-sport athlete")
  else if (classified.ageGroup === "adult") parts.push("adult")

  let label = parts.length > 0 ? parts.join(" ") : "general adult"

  const ageNum = Number(profile.age)
  if (!Number.isNaN(ageNum) && ageNum > 0) {
    label = `${label}, ${Math.round(ageNum)}`
  }

  return label
}

/**
 * Compare a marker's standard lab range vs. the profile-adapted (personal) range.
 * Intended for the analysis report "textbook vs. you" visual.
 */
export function getRangeComparison(
  markerName: string,
  value: number,
  profile: UserProfile
): RangeComparison {
  const classified = classifyUser(profile)
  const profileLabel = buildProfileLabel(classified, profile)
  const dbKey = resolveBloodworkToDbKey(markerName)
  const entry = biomarkerDatabase[dbKey]

  if (!entry) {
    return {
      marker: markerName,
      value,
      standardMin: null,
      standardMax: null,
      personalMin: null,
      personalMax: null,
      labReferenceMin: null,
      labReferenceMax: null,
      labReferenceSource: null,
      standardTiers: [],
      isPersonalized: false,
      mismatch: "unknown",
      profileLabel,
      verdict: `We don't have ${markerName} in Clarion's library yet, so we can't score it.`,
      verdictIsFlagged: false,
    }
  }

  const standardRange = entry.ranges.general
  const personalRange = getAdaptiveRange(markerName, profile) ?? standardRange

  const standardMin = standardRange.optimalMin
  const standardMax = standardRange.optimalMax
  const personalMin = personalRange.optimalMin
  const personalMax = personalRange.optimalMax

  const labRef = standardRange.labReference ?? null
  const standardTiers = getRangeTiers(standardRange)

  const isPersonalized =
    boundShifted(standardMin, personalMin) || boundShifted(standardMax, personalMax)

  const insideStandard = value >= standardMin && value <= standardMax
  const insidePersonal = value >= personalMin && value <= personalMax

  let mismatch: RangeComparison["mismatch"]
  if (!insideStandard && insidePersonal) {
    mismatch = "standard_flagged_personal_ok"
  } else if (insideStandard && !insidePersonal && value < personalMin) {
    mismatch = "standard_optimal_personal_low"
  } else if (insideStandard && !insidePersonal && value > personalMax) {
    mismatch = "standard_optimal_personal_high"
  } else if (insideStandard && insidePersonal) {
    mismatch = "aligned_in_range"
  } else if (value > standardMax) {
    mismatch = "aligned_high"
  } else {
    mismatch = "aligned_low"
  }

  const { verdict, verdictIsFlagged } = buildVerdict({
    marker: markerName,
    value,
    standardMin,
    standardMax,
    personalMin,
    personalMax,
    labReferenceMin: labRef?.min ?? null,
    labReferenceMax: labRef?.max ?? null,
    profileLabel,
    mismatch,
    isPersonalized,
  })

  return {
    marker: markerName,
    value,
    standardMin,
    standardMax,
    personalMin,
    personalMax,
    labReferenceMin: labRef ? labRef.min : null,
    labReferenceMax: labRef ? labRef.max : null,
    labReferenceSource: labRef?.source ?? null,
    standardTiers,
    isPersonalized,
    mismatch,
    profileLabel,
    verdict,
    verdictIsFlagged,
  }
}

function fmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 100) return String(Math.round(n))
  if (abs >= 10) return (Math.round(n * 10) / 10).toString()
  return (Math.round(n * 100) / 100).toString()
}

type VerdictInput = {
  marker: string
  value: number
  standardMin: number
  standardMax: number
  personalMin: number
  personalMax: number
  labReferenceMin: number | null
  labReferenceMax: number | null
  profileLabel: string
  mismatch: RangeComparison["mismatch"]
  isPersonalized: boolean
}

/**
 * Plain-English headline for a RangeComparison. Always references concrete numbers
 * so users don't have to decode the bar visual to understand the situation.
 */
function buildVerdict(input: VerdictInput): { verdict: string; verdictIsFlagged: boolean } {
  const {
    value,
    standardMin,
    standardMax,
    personalMin,
    personalMax,
    labReferenceMin,
    labReferenceMax,
    profileLabel,
    mismatch,
    isPersonalized,
  } = input

  switch (mismatch) {
    case "standard_optimal_personal_low": {
      const gap = fmt(personalMin - value)
      return {
        verdict: `Your ${fmt(value)} is inside the standard lab range but ${gap} below Clarion's target for ${profileLabel} (${fmt(personalMin)}–${fmt(personalMax)}).`,
        verdictIsFlagged: true,
      }
    }
    case "standard_optimal_personal_high": {
      const gap = fmt(value - personalMax)
      return {
        verdict: `Your ${fmt(value)} is inside the standard lab range but ${gap} above Clarion's target for ${profileLabel} (${fmt(personalMin)}–${fmt(personalMax)}).`,
        verdictIsFlagged: true,
      }
    }
    case "standard_flagged_personal_ok": {
      return {
        verdict: `Your ${fmt(value)} sits outside the standard lab range but inside Clarion's band for ${profileLabel} (${fmt(personalMin)}–${fmt(personalMax)}).`,
        verdictIsFlagged: false,
      }
    }
    case "aligned_in_range": {
      if (isPersonalized) {
        return {
          verdict: `Your ${fmt(value)} sits inside both the standard range and Clarion's tighter target for ${profileLabel} (${fmt(personalMin)}–${fmt(personalMax)}).`,
          verdictIsFlagged: false,
        }
      }
      return {
        verdict: `Your ${fmt(value)} sits inside the optimal band (${fmt(personalMin)}–${fmt(personalMax)}).`,
        verdictIsFlagged: false,
      }
    }
    case "aligned_high": {
      const labGap = labReferenceMax != null ? value - labReferenceMax : null
      const personalGap = value - personalMax
      if (labReferenceMax != null && value > labReferenceMax) {
        return {
          verdict: `Your ${fmt(value)} is above the lab's upper limit (${fmt(labReferenceMax)}) and ${fmt(personalGap)} above Clarion's ceiling (${fmt(personalMax)}) — high by both lenses.`,
          verdictIsFlagged: true,
        }
      }
      if (labReferenceMax != null && labGap != null && labGap <= 0) {
        return {
          verdict: `Your ${fmt(value)} is inside the lab's "normal" range but ${fmt(personalGap)} above Clarion's ceiling (${fmt(personalMax)}).`,
          verdictIsFlagged: true,
        }
      }
      return {
        verdict: `Your ${fmt(value)} is above Clarion's target ceiling (${fmt(personalMax)}) and above the standard range (${fmt(standardMin)}–${fmt(standardMax)}).`,
        verdictIsFlagged: true,
      }
    }
    case "aligned_low": {
      const personalGap = personalMin - value
      if (labReferenceMin != null && value < labReferenceMin) {
        return {
          verdict: `Your ${fmt(value)} is below the lab's lower limit (${fmt(labReferenceMin)}) and ${fmt(personalGap)} below Clarion's floor (${fmt(personalMin)}) — low by both lenses.`,
          verdictIsFlagged: true,
        }
      }
      if (labReferenceMin != null && value >= labReferenceMin) {
        return {
          verdict: `Your ${fmt(value)} is inside the lab's "normal" range but ${fmt(personalGap)} below Clarion's floor (${fmt(personalMin)}).`,
          verdictIsFlagged: true,
        }
      }
      return {
        verdict: `Your ${fmt(value)} is below Clarion's target floor (${fmt(personalMin)}) and below the standard range (${fmt(standardMin)}–${fmt(standardMax)}).`,
        verdictIsFlagged: true,
      }
    }
    case "unknown":
    default:
      return { verdict: "", verdictIsFlagged: false }
  }
}