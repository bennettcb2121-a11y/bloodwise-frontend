/**
 * Health context from height, weight, and profile type.
 * Used to tailor test recommendations and focus areas — not for diagnosis.
 */

export type HealthContextId =
  | "healthy"
  | "borderline_overweight"
  | "overweight"
  | "prediabetic_risk"
  | "underweight"

export type HealthContextResult = {
  id: HealthContextId
  label: string
  /** When true, emphasize metabolic/glycemic tests (HbA1c, fasting insulin, glucose). */
  emphasizeMetabolic?: boolean
  /** When true, emphasize iron/CBC (e.g. anemia profile). */
  emphasizeIron?: boolean
}

type ProfileInput = {
  height_cm?: number | null
  weight_kg?: number | null
  profile_type?: string | null
  goal?: string | null
  sex?: string | null
}

function bmi(heightCm: number, weightKg: number): number {
  if (heightCm <= 0) return 0
  const m = heightCm / 100
  return weightKg / (m * m)
}

const PREDIABETIC_PROFILE_TYPES = [
  "weight_loss_insulin_resistance",
  "prediabetes_metabolic_risk",
]
const ANEMIA_PROFILE_TYPES = ["anemia_low_iron", "female_athlete"]

/**
 * Derive a simple health context for recommendation tailoring only.
 * Does not diagnose; wording is "focus area" / "risk context".
 */
export function getHealthContext(profile: ProfileInput): HealthContextResult | null {
  const height = profile.height_cm != null ? Number(profile.height_cm) : NaN
  const weight = profile.weight_kg != null ? Number(profile.weight_kg) : NaN
  const profileType = (profile.profile_type ?? "").trim().toLowerCase()
  const goal = (profile.goal ?? "").trim().toLowerCase()

  const hasBmi = Number.isFinite(height) && Number.isFinite(weight) && height > 0 && weight > 0
  const bmiValue = hasBmi ? bmi(height, weight) : 0

  const isPrediabeticProfile =
    PREDIABETIC_PROFILE_TYPES.some((t) => profileType.includes(t)) ||
    goal.includes("weight") ||
    goal.includes("insulin") ||
    goal.includes("metabolic")
  const isAnemiaProfile =
    ANEMIA_PROFILE_TYPES.some((t) => profileType.includes(t)) ||
    profileType.includes("anemia")

  if (isAnemiaProfile && profile.sex?.toLowerCase() === "female") {
    return {
      id: "healthy",
      label: "Focus on iron and energy markers",
      emphasizeIron: true,
    }
  }

  if (isPrediabeticProfile && hasBmi && bmiValue >= 25) {
    return {
      id: "prediabetic_risk",
      label: "Focus on metabolic and glycemic markers",
      emphasizeMetabolic: true,
    }
  }

  if (!hasBmi) {
    return null
  }

  if (bmiValue < 18.5) {
    return {
      id: "underweight",
      label: "General wellness",
      emphasizeMetabolic: false,
    }
  }
  if (bmiValue >= 30) {
    return {
      id: "overweight",
      label: "Focus on metabolic health",
      emphasizeMetabolic: true,
    }
  }
  if (bmiValue >= 25) {
    return {
      id: "borderline_overweight",
      label: "Focus on metabolic and heart health",
      emphasizeMetabolic: true,
    }
  }

  return {
    id: "healthy",
    label: "General wellness",
  }
}
