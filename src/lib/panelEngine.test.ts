import { describe, it, expect } from "vitest"
import { getAdaptiveRecommendedMarkers, hasAnyBiomarkerValue } from "./panelEngine"

const keys = [
  "Ferritin",
  "Vitamin D",
  "Magnesium",
  "Vitamin B12",
  "hs-CRP",
  "Glucose",
  "HbA1c",
  "Testosterone",
  "LDL-C",
  "Triglycerides",
  "HDL-C",
  "Fasting insulin",
  "TSH",
  "Lipoprotein(a)",
  "ApoB",
  "Cortisol (AM)",
  "ESR",
  "Hemoglobin",
  "Hematocrit",
  "RBC",
  "WBC",
]

describe("getAdaptiveRecommendedMarkers", () => {
  it("differs between strength and heart-health profile types", () => {
    const strength = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "male",
        sport: "Strength",
        goal: "hypertrophy",
        profileType: "strength_hypertrophy_athlete",
      },
      keys
    )
    const heart = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "male",
        sport: "General health",
        goal: "wellness",
        profileType: "heart_health_longevity",
      },
      keys
    )
    expect(new Set(strength)).not.toEqual(new Set(heart))
    expect(strength.some((m) => /testosterone/i.test(m))).toBe(true)
    expect(heart.some((m) => /apob|lipoprotein|ldl/i.test(m))).toBe(true)
  })

  it("moves optimal markers to the end when deprioritizeOptimalKeys is set", () => {
    const base = getAdaptiveRecommendedMarkers(
      {
        age: "30",
        sex: "male",
        sport: "General health",
        goal: "general",
        profileType: "general_health_adult",
      },
      keys
    )
    expect(base.length).toBeGreaterThan(2)
    const moveMe = base[0]
    const reordered = getAdaptiveRecommendedMarkers(
      {
        age: "30",
        sex: "male",
        sport: "General health",
        goal: "general",
        profileType: "general_health_adult",
      },
      keys,
      { deprioritizeOptimalKeys: [moveMe] }
    )
    expect(reordered[reordered.length - 1]).toBe(moveMe)
    expect(reordered[0]).not.toBe(moveMe)
  })

  it("merges recommended markers when multiple onboarding health goals are selected", () => {
    const single = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "male",
        sport: "",
        goal: "",
        profileType: "",
        healthGoal: "more_energy",
      },
      keys
    )
    const merged = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "male",
        sport: "",
        goal: "",
        profileType: "",
        healthGoal: "more_energy,longevity",
      },
      keys
    )
    const singleSet = new Set(single)
    expect(merged.length).toBeGreaterThanOrEqual(single.length)
    expect(single.every((k) => merged.includes(k))).toBe(true)
    expect(merged.some((k) => !singleSet.has(k))).toBe(true)
  })

  it("uses symptoms when profile type and health goal are empty", () => {
    const fromSymptoms = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "female",
        sport: "",
        goal: "",
        symptoms: "fatigue, low energy",
      },
      keys
    )
    const generic = getAdaptiveRecommendedMarkers(
      {
        age: "32",
        sex: "female",
        sport: "",
        goal: "",
      },
      keys
    )
    expect(fromSymptoms.length).toBeGreaterThan(0)
    expect(new Set(fromSymptoms)).not.toEqual(new Set(generic))
  })
})

describe("hasAnyBiomarkerValue", () => {
  it("is false for empty or blank strings", () => {
    expect(hasAnyBiomarkerValue({ Ferritin: "", "Vitamin D": "  " })).toBe(false)
  })

  it("is true when any value parses as a finite number", () => {
    expect(hasAnyBiomarkerValue({ Ferritin: "45", "Vitamin D": "" })).toBe(true)
    expect(hasAnyBiomarkerValue({ Glucose: 99 })).toBe(true)
  })
})
