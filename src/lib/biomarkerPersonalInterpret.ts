/**
 * Personalized per-biomarker interpretation. Combines:
 *   • adaptive range from analyzeBiomarkers (range varies by sex / age / training)
 *   • phenotype-aware rules from phenotypeRules (explicit editorial overrides)
 *   • cross-marker pattern detection (anemia, insulin resistance, etc.)
 *
 * The output is deterministic and JSON-serializable so it can be shown directly
 * in the UI or handed to the interpret API as structured context for the AI.
 */

import { biomarkerDatabase, type BiomarkerRange } from "@/src/lib/biomarkerDatabase"
import { resolveBloodworkToDbKey } from "@/src/lib/biomarkerAliases"
import { classifyUser, type UserProfile } from "@/src/lib/classifyUser"
import { buildPhenotype, type Phenotype } from "@/src/lib/phenotypeContext"
import { getMatchingRules, type BiomarkerStatus } from "@/src/lib/phenotypeRules"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"

export type PersonalInterpretation = {
  biomarkerKey: string
  value: number
  unit: string
  range: { optimalMin: number; optimalMax: number } | null
  /** Final status after range + rule application. */
  status: BiomarkerStatus
  /** Standard editorial line (non-personalized). */
  base: string
  /** Phenotype-specific notes (zero or more). */
  personal: string[]
  /** Red-flag text when any rule sets redFlag. */
  redFlag: string | null
  /** Pattern-derived extra notes surfaced only when multiple markers align. */
  patternNotes: string[]
  /** Supplement hints from rules (filterable by user's form preference downstream). */
  supplementHints: {
    suggest: string[]
    avoid: string[]
    preferForm: string[]
  }
}

/** Cross-marker patterns — names kept loose; rules are order-independent. */
export type DetectedPattern = {
  id: string
  title: string
  explanation: string
  markers: string[]
  severity: "info" | "elevated" | "high"
}

function baseStatus(value: number, range: BiomarkerRange | undefined): BiomarkerStatus {
  if (!range) return "unknown"
  if (typeof range.deficient === "number" && value < range.deficient) return "deficient"
  if (typeof range.suboptimalMin === "number" && value < range.optimalMin) return "suboptimal"
  if (typeof range.elevatedMin === "number" && typeof range.highMin === "number") {
    if (value >= range.highMin) return "high"
    if (value >= range.elevatedMin) return "suboptimal"
    if (value >= range.optimalMin && value < range.elevatedMin) return "optimal"
  }
  if (value > range.optimalMax) return "high"
  return "optimal"
}

function adaptiveRange(biomarkerKey: string, profile: UserProfile): BiomarkerRange | null {
  const entry = biomarkerDatabase[biomarkerKey]
  if (!entry) return null
  const classified = classifyUser(profile)
  let range = entry.ranges.general
  if (classified.userClass === "endurance" && entry.ranges.endurance) range = entry.ranges.endurance
  else if (classified.userClass === "strength" && entry.ranges.strength) range = entry.ranges.strength
  else if (classified.userClass === "mixed" && entry.ranges.mixed) range = entry.ranges.mixed
  if (classified.sex === "female" && entry.ranges.female) range = { ...range, ...entry.ranges.female }
  if (classified.sex === "male" && entry.ranges.male) range = { ...range, ...entry.ranges.male }
  if (classified.ageGroup === "masters" && entry.ranges.masters) range = { ...range, ...entry.ranges.masters }
  if (classified.ageGroup === "adolescent" && entry.ranges.adolescent) range = { ...range, ...entry.ranges.adolescent }
  return range
}

function baseInterpretationLine(biomarkerKey: string, status: BiomarkerStatus): string {
  const entry = biomarkerDatabase[biomarkerKey]
  if (!entry) return ""
  switch (status) {
    case "optimal":
      return `${biomarkerKey} is in the optimal range.`
    case "suboptimal":
      return `${biomarkerKey} is suboptimal. ${entry.whyItMatters ?? ""}`
    case "deficient":
      return `${biomarkerKey} is deficient. ${entry.whyItMatters ?? ""}`
    case "high":
      return `${biomarkerKey} is above the optimal range. ${entry.whyItMatters ?? ""}`
    case "low":
      return `${biomarkerKey} is below where we'd like to see it. ${entry.whyItMatters ?? ""}`
    default:
      return entry.description ?? ""
  }
}

/** Primary entry point: interpret one biomarker value for one user. */
export function interpretBiomarkerPersonal(
  rawBiomarkerName: string,
  value: number,
  unit: string,
  phenotype: Phenotype,
  userProfileForRanges: UserProfile
): PersonalInterpretation {
  const biomarkerKey = resolveBloodworkToDbKey(rawBiomarkerName)
  const entry = biomarkerDatabase[biomarkerKey]
  const range = adaptiveRange(biomarkerKey, userProfileForRanges)
  let status = baseStatus(value, range ?? undefined)

  const matchingRules = getMatchingRules(biomarkerKey, phenotype, value)

  // Rules can override status to a tighter one (e.g. endurance-female ferritin < 30 → "low").
  for (const r of matchingRules) {
    if (r.status) status = r.status
  }

  const personal: string[] = []
  let redFlag: string | null = null
  const supplementHints = { suggest: [] as string[], avoid: [] as string[], preferForm: [] as string[] }
  for (const r of matchingRules) {
    personal.push(r.note)
    if (r.redFlag) redFlag = r.note
    if (r.supplementHints?.suggest) supplementHints.suggest.push(...r.supplementHints.suggest)
    if (r.supplementHints?.avoid) supplementHints.avoid.push(...r.supplementHints.avoid)
    if (r.supplementHints?.preferForm) supplementHints.preferForm.push(...r.supplementHints.preferForm)
  }

  return {
    biomarkerKey,
    value,
    unit,
    range: range ? { optimalMin: range.optimalMin, optimalMax: range.optimalMax } : null,
    status,
    base: baseInterpretationLine(biomarkerKey, status),
    personal,
    redFlag,
    patternNotes: [],
    supplementHints,
    // Included so UI can add "retest in X" without re-looking up the entry.
    ...(entry?.retest ? { retestHint: entry.retest } : {}),
  } as PersonalInterpretation
}

/** Build phenotype + a minimal UserProfile in one step from a profiles row. */
export function phenotypeFromProfile(profile: Partial<ProfileRow> | null | undefined) {
  return {
    phenotype: buildPhenotype(profile ?? null),
    userProfileForRanges: {
      age: profile?.age ? parseInt(String(profile.age), 10) : undefined,
      sex: profile?.sex,
      sport: profile?.sport,
      goal: profile?.goal,
      trainingFocus: profile?.training_focus ?? undefined,
    } as UserProfile,
  }
}

/** Detect cross-marker patterns that matter for a personalized narrative. */
export function detectPatterns(values: Record<string, number>): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  const ironDeficient =
    (typeof values.Ferritin === "number" && values.Ferritin < 30) ||
    (typeof values["Serum iron"] === "number" && values["Serum iron"] < 50)
  const lowHgb = typeof values.Hemoglobin === "number" && values.Hemoglobin < 13
  if (ironDeficient && lowHgb) {
    patterns.push({
      id: "iron_deficiency_anemia",
      title: "Iron-deficiency anemia pattern",
      explanation:
        "Low ferritin combined with a low hemoglobin is the classic signature of iron-deficiency anemia. Repleting iron stores over 3–4 months typically resolves the anemia; work with a clinician if you have GI symptoms.",
      markers: ["Ferritin", "Hemoglobin"],
      severity: "high",
    })
  } else if (ironDeficient) {
    patterns.push({
      id: "low_iron_stores",
      title: "Low iron stores without anemia",
      explanation:
        "Ferritin is low but hemoglobin is still in range — this is depleted-stores-without-anemia, often the earliest reason for fatigue and poor training recovery.",
      markers: ["Ferritin"],
      severity: "elevated",
    })
  }

  const hiA1c = typeof values.HbA1c === "number" && values.HbA1c >= 5.7
  const hiTg = typeof values.Triglycerides === "number" && values.Triglycerides >= 150
  const loHdl = typeof values["HDL-C"] === "number" && values["HDL-C"] < 40
  if (hiA1c && (hiTg || loHdl)) {
    patterns.push({
      id: "insulin_resistance_lipid",
      title: "Insulin-resistant lipid pattern",
      explanation:
        "A rising HbA1c paired with high triglycerides and/or low HDL is the metabolic syndrome signature. Weight loss, aerobic + resistance training, and a lower-glycemic pattern move all three at once.",
      markers: ["HbA1c", "Triglycerides", "HDL-C"].filter(
        (m) => typeof values[m as keyof typeof values] === "number"
      ),
      severity: hiA1c && values.HbA1c >= 6.5 ? "high" : "elevated",
    })
  }

  const hiHomo = typeof values.Homocysteine === "number" && values.Homocysteine >= 11
  const loB12 = typeof values["Vitamin B12"] === "number" && values["Vitamin B12"] < 400
  if (hiHomo && loB12) {
    patterns.push({
      id: "functional_b12_deficit",
      title: "Functional B12 / methylation gap",
      explanation:
        "Elevated homocysteine alongside low-normal B12 fits functional B12 deficiency. Methylcobalamin plus methylfolate for 8–12 weeks, then retest.",
      markers: ["Homocysteine", "Vitamin B12"],
      severity: "elevated",
    })
  }

  const hiTsh = typeof values.TSH === "number" && values.TSH >= 4.5
  const posTpo = typeof values["TPO antibodies"] === "number" && values["TPO antibodies"] >= 35
  if (hiTsh && posTpo) {
    patterns.push({
      id: "hashimoto_pattern",
      title: "Hashimoto pattern",
      explanation:
        "A rising TSH with positive TPO antibodies fits autoimmune hypothyroidism (Hashimoto). This is a clinician conversation — add Free T4 and Free T3 and repeat in 6–8 weeks.",
      markers: ["TSH", "TPO antibodies"],
      severity: "high",
    })
  }

  const hiCrp = typeof values["hs-CRP"] === "number" && values["hs-CRP"] >= 3
  const hiFerr = typeof values.Ferritin === "number" && values.Ferritin > 300
  if (hiCrp && hiFerr) {
    patterns.push({
      id: "inflammatory_high_ferritin",
      title: "Inflammation-driven ferritin elevation",
      explanation:
        "High ferritin paired with high hs-CRP usually reflects inflammation, not iron overload. Address the inflammatory driver and re-test in 8 weeks before iron-overload workup.",
      markers: ["Ferritin", "hs-CRP"],
      severity: "elevated",
    })
  }

  return patterns
}

/**
 * Interpret the full panel. Produces one PersonalInterpretation per biomarker plus the patterns.
 * `values` keys are accepted in either canonical biomarkerDatabase form or raw (passed through aliases).
 */
export function interpretPanelPersonal(
  values: Record<string, { value: number; unit?: string }>,
  profile: Partial<ProfileRow> | null | undefined
): { interpretations: PersonalInterpretation[]; patterns: DetectedPattern[] } {
  const { phenotype, userProfileForRanges } = phenotypeFromProfile(profile)
  const interpretations: PersonalInterpretation[] = []
  const valueMap: Record<string, number> = {}
  for (const [rawName, { value, unit }] of Object.entries(values)) {
    if (!Number.isFinite(value)) continue
    const interp = interpretBiomarkerPersonal(rawName, value, unit ?? "", phenotype, userProfileForRanges)
    interpretations.push(interp)
    valueMap[interp.biomarkerKey] = value
  }
  return {
    interpretations,
    patterns: detectPatterns(valueMap),
  }
}
