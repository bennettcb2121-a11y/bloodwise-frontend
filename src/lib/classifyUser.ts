import type { AgeGroup, Sex, UserClass } from "./biomarkerDatabase"

export type UserProfile = {
  age?: string | number
  sex?: string
  sport?: string
  volume?: string
  diet?: string
}

export type ClassifiedUser = {
  userClass: UserClass
  sex: Sex
  ageGroup: AgeGroup
  trainingLoad: "low" | "moderate" | "high" | "elite"
  dietRisk: "low" | "moderate" | "high"
}

function normalize(value: string | number | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function classifySport(sport: string): UserClass {
  const s = normalize(sport)

  // Onboarding activity options: Endurance, Hybrid, General health, Sedentary
  if (
    s.includes("endurance") ||
    s.includes("run") ||
    s.includes("cycling") ||
    s.includes("cycl") ||
    s.includes("triathlon") ||
    s.includes("tri") ||
    s.includes("row") ||
    s.includes("swim")
  ) {
    return "endurance"
  }

  if (
    s.includes("hybrid") ||
    s.includes("soccer") ||
    s.includes("basketball") ||
    s.includes("hockey") ||
    s.includes("lacrosse") ||
    s.includes("mixed") ||
    s.includes("team")
  ) {
    return "mixed"
  }

  if (
    s.includes("strength") ||
    s.includes("football") ||
    s.includes("lifting") ||
    s.includes("weightlifting") ||
    s.includes("power") ||
    s.includes("sprint")
  ) {
    return "strength"
  }

  // General health, Sedentary, or unknown -> general ranges
  return "general"
}

function classifySex(sex: string): Sex {
  const s = normalize(sex)
  if (s === "male") return "male"
  if (s === "female") return "female"
  return "unknown"
}

function classifyAgeGroup(age: string | number | undefined): AgeGroup {
  const n = Number(age)

  if (Number.isNaN(n)) return "adult"
  if (n < 18) return "adolescent"
  if (n >= 50) return "masters"
  return "adult"
}

function classifyTrainingLoad(volume: string): ClassifiedUser["trainingLoad"] {
  const v = normalize(volume)

  if (v === "elite") return "elite"
  if (v === "high") return "high"
  if (v === "moderate") return "moderate"
  return "low"
}

function classifyDietRisk(diet: string): ClassifiedUser["dietRisk"] {
  const d = normalize(diet)

  if (d === "vegan") return "high"
  if (d === "vegetarian") return "moderate"
  return "low"
}

export function classifyUser(profile: UserProfile = {}): ClassifiedUser {
  return {
    userClass: classifySport(profile.sport ?? ""),
    sex: classifySex(profile.sex ?? ""),
    ageGroup: classifyAgeGroup(profile.age),
    trainingLoad: classifyTrainingLoad(profile.volume ?? ""),
    dietRisk: classifyDietRisk(profile.diet ?? ""),
  }
}