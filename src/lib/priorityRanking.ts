/**
 * Context-aware priority for flagged biomarkers: profile archetype, symptoms, sex/age, sport,
 * and panel position combine with lab severity so high-signal issues (e.g. iron for a fatigued runner)
 * rank above less relevant flags. Composable rules — extend SYMPTOM_MARKER_WEIGHTS and PROFILE_* as needed.
 *
 * **Ranking (see `computeDriverPriorityScore`)**: start from lab penalty × 1000 (deficient > low/high
 * > suboptimal), then add boosts from symptom→marker weights, sport, sex/age, profile panel,
 * iron synergy (fatigue + iron line), lipid synergy (multiple lipids + heart/metabolic goal), and goal text.
 * Higher score = higher priority. Consumed by `getOrderedScoreDrivers` / `getOrderedFocusResults` only.
 */

import { resolveActionPlanDbKey } from "./actionPlans"
import { getProfilePanelBoost, healthGoalToProfileType, parseHealthGoalIds } from "./clarionProfiles"
import { isLipidRelatedMarkerName } from "./lipidPanelContext"

/** Single source for onboarding + settings (ids match SYMPTOM_MARKER_WEIGHTS keys). */
export const SYMPTOM_OPTIONS = [
  { id: "fatigue", label: "Fatigue" },
  { id: "brain_fog", label: "Brain fog" },
  { id: "low_energy", label: "Low energy" },
  { id: "poor_recovery", label: "Poor recovery" },
  { id: "sleep_issues", label: "Sleep issues" },
  { id: "none", label: "None" },
] as const

export type UserPriorityContext = {
  age?: string
  sex?: string
  sport?: string
  /** Clarion profile_type (e.g. endurance_athlete, fatigue_low_energy) */
  profileType?: string | null
  /** Comma-separated health goal ids — panel boost uses the best match across all selected goals. */
  healthGoals?: string | null
  /** Comma-separated symptom ids from onboarding (e.g. fatigue,low_energy,sleep_issues) */
  symptoms?: string | null
  goal?: string
}

/** Same weights as scoreBreakdown.penaltyForStatus — kept local to avoid circular imports. */
function penaltyForStatus(status: string): number {
  const s = status.toLowerCase()
  if (s === "deficient") return 18
  if (s === "low") return 12
  if (s === "suboptimal") return 8
  if (s === "high") return 10
  return 0
}

function parseAgeYears(age?: string): number | null {
  if (!age?.trim()) return null
  const n = parseInt(age.replace(/\D/g, ""), 10)
  return Number.isFinite(n) && n > 0 && n < 120 ? n : null
}

function normalizeSymptomList(symptoms?: string | null): string[] {
  if (!symptoms?.trim() || symptoms === "none") return []
  return symptoms
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Symptom id → marker name substring / key → boost (0–40). Add rows as product expands. */
const SYMPTOM_MARKER_WEIGHTS: Record<string, Record<string, number>> = {
  fatigue: {
    Ferritin: 38,
    Hemoglobin: 34,
    Hematocrit: 32,
    RBC: 30,
    MCV: 26,
    MCH: 24,
    RDW: 22,
    "Vitamin B12": 32,
    "Serum iron": 28,
    TIBC: 22,
    "Transferrin saturation": 28,
    TSH: 28,
    "Free T4": 22,
    "Vitamin D": 24,
    Magnesium: 22,
    Glucose: 18,
    "Fasting Glucose": 18,
    "Fasting insulin": 18,
    HbA1c: 20,
  },
  low_energy: {
    Ferritin: 38,
    Hemoglobin: 34,
    Hematocrit: 32,
    RBC: 30,
    "Vitamin B12": 30,
    TSH: 28,
    "Vitamin D": 26,
    Magnesium: 24,
    Glucose: 18,
    HbA1c: 20,
  },
  brain_fog: {
    "Vitamin B12": 36,
    Ferritin: 28,
    "Vitamin D": 24,
    Glucose: 22,
    HbA1c: 20,
    Magnesium: 20,
    TSH: 22,
  },
  poor_recovery: {
    "hs-CRP": 36,
    CRP: 34,
    Magnesium: 30,
    Ferritin: 26,
    "Vitamin D": 24,
    Glucose: 18,
    HbA1c: 18,
  },
  sleep_issues: {
    Magnesium: 34,
    "Vitamin D": 22,
    "Cortisol (AM)": 28,
    Glucose: 16,
    Ferritin: 18,
    TSH: 18,
  },
}

function markerMatchesKey(resolved: string, raw: string, key: string): boolean {
  const k = key.toLowerCase()
  const r = resolved.toLowerCase()
  const u = raw.toLowerCase()
  if (r === k || u === k) return true
  if (r.includes(k) || u.includes(k)) return true
  if (k.includes("crp") && (r.includes("crp") || u.includes("crp"))) return true
  if (k.includes("vitamin d") && (r.includes("vitamin d") || u.includes("25"))) return true
  if (k.includes("testosterone") && r.includes("testosterone")) return true
  if (k.includes("glucose") && (r.includes("glucose") || u.includes("fasting"))) return true
  return false
}

function symptomBoost(symptoms: string[], resolved: string, raw: string): number {
  let max = 0
  for (const sid of symptoms) {
    const table = SYMPTOM_MARKER_WEIGHTS[sid]
    if (!table) continue
    for (const [mk, w] of Object.entries(table)) {
      if (markerMatchesKey(resolved, raw, mk)) max = Math.max(max, w)
    }
  }
  return max
}

/** Sport / training string (free text) → boosts */
function sportBoost(sport: string | undefined, resolved: string, raw: string): number {
  const s = (sport || "").toLowerCase()
  let b = 0
  if (
    s.includes("run") ||
    s.includes("cycl") ||
    s.includes("endurance") ||
    s.includes("tri") ||
    s.includes("marathon")
  ) {
    if (markerMatchesKey(resolved, raw, "Ferritin")) b = Math.max(b, 28)
    if (markerMatchesKey(resolved, raw, "Hemoglobin")) b = Math.max(b, 24)
    if (markerMatchesKey(resolved, raw, "Hematocrit")) b = Math.max(b, 22)
    if (markerMatchesKey(resolved, raw, "RBC")) b = Math.max(b, 20)
  }
  if (s.includes("strength") || s.includes("lift") || s.includes("hypertrophy") || s.includes("bodybuilding")) {
    if (markerMatchesKey(resolved, raw, "Testosterone")) b = Math.max(b, 26)
    if (markerMatchesKey(resolved, raw, "Free testosterone")) b = Math.max(b, 24)
    if (markerMatchesKey(resolved, raw, "SHBG")) b = Math.max(b, 18)
    if (markerMatchesKey(resolved, raw, "Vitamin D")) b = Math.max(b, 18)
    if (markerMatchesKey(resolved, raw, "Magnesium")) b = Math.max(b, 16)
  }
  return b
}

function sexAgeBoost(
  ctx: UserPriorityContext,
  resolved: string,
  raw: string
): number {
  const sex = (ctx.sex || "").toLowerCase()
  const age = parseAgeYears(ctx.age)
  const pt = (ctx.profileType || "").toLowerCase()
  let b = 0

  const maleHormoneProfile =
    pt.includes("male_hormone") ||
    pt.includes("young_adult_male") ||
    pt.includes("strength_hypertrophy")

  if (sex === "male" && maleHormoneProfile && age != null && age >= 18 && age <= 55) {
    if (markerMatchesKey(resolved, raw, "Testosterone")) b = Math.max(b, 32)
    if (markerMatchesKey(resolved, raw, "Free testosterone")) b = Math.max(b, 30)
    if (markerMatchesKey(resolved, raw, "SHBG")) b = Math.max(b, 20)
  }

  if (
    sex === "male" &&
    age != null &&
    age >= 25 &&
    age <= 55 &&
    (pt.includes("strength") || pt.includes("male_hormone"))
  ) {
    if (markerMatchesKey(resolved, raw, "Testosterone")) b = Math.max(b, 22)
  }

  if (sex === "female" && (pt.includes("female_athlete") || pt.includes("endurance_athlete"))) {
    if (markerMatchesKey(resolved, raw, "Ferritin")) b = Math.max(b, 26)
    if (markerMatchesKey(resolved, raw, "Hemoglobin")) b = Math.max(b, 20)
  }

  if (sex === "female" && (pt.includes("perimenopause") || (age != null && age >= 40 && age <= 60))) {
    if (markerMatchesKey(resolved, raw, "Estradiol")) b = Math.max(b, 22)
    if (markerMatchesKey(resolved, raw, "TSH")) b = Math.max(b, 18)
  }

  return b
}

/** When energy symptoms exist and any iron/CBC marker is flagged, prioritize iron line */
function ironSynergyBoost(
  symptoms: string[],
  report: { name?: string; status?: string }[],
  resolved: string,
  raw: string
): number {
  const energySymptom = symptoms.some((s) => s === "fatigue" || s === "low_energy")
  if (!energySymptom) return 0

  const ironRelated = report.some((item) => {
    const n = (item.name || "").toLowerCase()
    const st = (item.status || "").toLowerCase()
    if (!["deficient", "low", "suboptimal", "high"].includes(st)) return false
    return (
      n.includes("ferritin") ||
      n.includes("hemoglobin") ||
      n.includes("hematocrit") ||
      n.includes("iron") ||
      n.includes("transferrin")
    )
  })
  if (!ironRelated) return 0

  if (
    markerMatchesKey(resolved, raw, "Ferritin") ||
    markerMatchesKey(resolved, raw, "Hemoglobin") ||
    markerMatchesKey(resolved, raw, "Hematocrit") ||
    markerMatchesKey(resolved, raw, "Serum iron") ||
    markerMatchesKey(resolved, raw, "Transferrin saturation")
  ) {
    return 45
  }
  return 0
}

/** When multiple lipid markers are off, keep them comparably ranked for heart/metabolic profiles (panel thinking). */
function lipidPanelSynergyBoost(
  ctx: UserPriorityContext,
  report: { name?: string; status?: string }[],
  resolved: string,
  raw: string
): number {
  const pt = (ctx.profileType || "").toLowerCase()
  const g = (ctx.goal || "").toLowerCase()
  const heartish =
    pt.includes("heart") ||
    pt.includes("longevity") ||
    pt.includes("weight_loss") ||
    pt.includes("insulin") ||
    pt.includes("metabolic") ||
    pt.includes("prediabetes") ||
    g.includes("heart") ||
    g.includes("lipid") ||
    g.includes("cholesterol")
  if (!heartish) return 0

  const flaggedLipids = report.filter((item) => {
    const st = (item.status || "").toLowerCase()
    if (!["deficient", "low", "suboptimal", "high"].includes(st)) return false
    const n = (item.name || "").trim()
    return n.length > 0 && isLipidRelatedMarkerName(n)
  })
  if (flaggedLipids.length < 2) return 0

  const label = `${resolved} ${raw}`
  if (isLipidRelatedMarkerName(label)) return 26
  return 0
}

function goalBoost(goal: string | undefined, resolved: string, raw: string): number {
  const g = (goal || "").toLowerCase()
  let b = 0
  if (g.includes("energy") || g.includes("fatigue")) {
    if (markerMatchesKey(resolved, raw, "Ferritin")) b = Math.max(b, 18)
    if (markerMatchesKey(resolved, raw, "TSH")) b = Math.max(b, 14)
  }
  if (g.includes("performance") || g.includes("endurance")) {
    if (markerMatchesKey(resolved, raw, "Ferritin")) b = Math.max(b, 20)
  }
  return b
}

export function isPriorityContextEmpty(ctx?: UserPriorityContext | null): boolean {
  if (!ctx) return true
  const has =
    (ctx.age || "").trim() ||
    (ctx.sex || "").trim() ||
    (ctx.sport || "").trim() ||
    (ctx.profileType || "").trim() ||
    (ctx.healthGoals || "").trim() ||
    (ctx.symptoms || "").trim() ||
    (ctx.goal || "").trim()
  return !has
}

/**
 * Higher = more urgent. Used to sort drivers within/beyond raw lab severity.
 */
export function computeDriverPriorityScore(
  markerName: string,
  status: string,
  report: { name?: string; status?: string }[],
  ctx?: UserPriorityContext | null
): number {
  const raw = markerName.trim()
  const resolved = resolveActionPlanDbKey(raw)
  const base = penaltyForStatus(status) * 1000

  if (!ctx || isPriorityContextEmpty(ctx)) return base

  const symptoms = normalizeSymptomList(ctx.symptoms)
  const goalIds = parseHealthGoalIds(ctx.healthGoals ?? undefined)
  let profileBoost = getProfilePanelBoost(ctx.profileType, resolved, raw)
  for (const gid of goalIds) {
    const pt = healthGoalToProfileType(gid)
    profileBoost = Math.max(profileBoost, getProfilePanelBoost(pt, resolved, raw))
  }
  let boost =
    profileBoost +
    symptomBoost(symptoms, resolved, raw) +
    sportBoost(ctx.sport, resolved, raw) +
    sexAgeBoost(ctx, resolved, raw) +
    ironSynergyBoost(symptoms, report, resolved, raw) +
    lipidPanelSynergyBoost(ctx, report, resolved, raw) +
    goalBoost(ctx.goal, resolved, raw)

  return base + boost
}

export function buildPriorityContextFromProfile(profile: {
  age?: string
  sex?: string
  sport?: string
  goal?: string
  profile_type?: string | null
  health_goals?: string | null
  /** Performance training focus — aligns with profiles.training_focus */
  training_focus?: string | null
  symptoms?: string | null
} | null): UserPriorityContext | undefined {
  if (!profile) return undefined
  return {
    age: profile.age,
    sex: profile.sex,
    sport: profile.sport,
    goal: profile.goal,
    profileType: profile.profile_type,
    healthGoals: profile.health_goals,
    symptoms: profile.symptoms,
  }
}
