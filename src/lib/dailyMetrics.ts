/**
 * Self-reported daily metrics between blood panels. Stored in protocol_log.metrics (jsonb).
 * All fields optional; user picks what to track. Used for trends — not clinical measurements.
 */

export type DailyMetrics = {
  /** 1 = low … 5 = very high */
  activity_level?: number
  /** Minutes outdoors / deliberate sun (rough) */
  sun_minutes?: number
  /** Glasses or 8oz cups — rough */
  hydration_cups?: number
  /** Self-reported hours slept */
  sleep_hours?: number
  /** Optional daily weight (kg); profile still holds baseline from settings */
  weight_kg?: number
  /** Free text, max length enforced in UI */
  notes?: string
}

export const DAILY_METRICS_KEYS = [
  "activity_level",
  "sun_minutes",
  "hydration_cups",
  "sleep_hours",
  "weight_kg",
  "notes",
] as const

export function clampDailyMetrics(m: Partial<DailyMetrics>): DailyMetrics {
  const out: DailyMetrics = {}
  if (typeof m.activity_level === "number" && Number.isFinite(m.activity_level)) {
    out.activity_level = Math.min(5, Math.max(1, Math.round(m.activity_level)))
  }
  if (typeof m.sun_minutes === "number" && Number.isFinite(m.sun_minutes)) {
    out.sun_minutes = Math.min(600, Math.max(0, Math.round(m.sun_minutes)))
  }
  if (typeof m.hydration_cups === "number" && Number.isFinite(m.hydration_cups)) {
    out.hydration_cups = Math.min(30, Math.max(0, Math.round(m.hydration_cups * 2) / 2))
  }
  if (typeof m.sleep_hours === "number" && Number.isFinite(m.sleep_hours)) {
    out.sleep_hours = Math.min(16, Math.max(0, Math.round(m.sleep_hours * 2) / 2))
  }
  if (typeof m.weight_kg === "number" && Number.isFinite(m.weight_kg) && m.weight_kg > 20 && m.weight_kg < 400) {
    out.weight_kg = Math.round(m.weight_kg * 10) / 10
  }
  if (typeof m.notes === "string" && m.notes.trim()) {
    out.notes = m.notes.trim().slice(0, 280)
  }
  return out
}

export function emptyDailyMetrics(): DailyMetrics {
  return {}
}
