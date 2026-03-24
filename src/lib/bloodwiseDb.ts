/**
 * Bloodwise Supabase persistence: profiles and bloodwork saves.
 */

import { supabase } from "./supabase"

export type ProfileRow = {
  id?: string
  user_id: string
  age: string
  sex: string
  sport: string
  goal: string
  current_supplement_spend: string
  current_supplements: string
  shopping_preference: string
  email?: string | null
  phone?: string | null
  retest_weeks?: number | null
  improvement_preference?: string | null
  profile_type?: string | null
  analysis_purchased_at?: string | null
  results_flow_completed_at?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  supplement_form_preference?: string | null
  /** Diet preference for contextual insights (e.g. vegetarian, vegan). */
  diet_preference?: string | null
  /** Show in-app toast when protocol streak hits a milestone (e.g. 7, 10, 30 days). */
  streak_milestones?: boolean | null
  /** Include daily protocol reminder in retest/reminder emails when true. */
  daily_reminder?: boolean | null
  /** Optional health score goal (e.g. 80) for dashboard progress. */
  score_goal?: number | null
  /** Email when a supplement is running low (reorder reminder). */
  notify_reorder_email?: boolean | null
  /** Days before run-out to send reorder reminder (default 7). */
  notify_reorder_days?: number | null
  updated_at?: string
}

/** Serializable shape for detected pattern (from patternEngine) */
export type BloodworkDetectedPattern = {
  title: string
  explanation: string
  focusActions: string[]
  significance: string
  markers: string[]
}

/** Saved supplement stack item attached to each bloodwork panel */
export type SavedSupplementStackItem = {
  supplementName: string
  dose: string
  monthlyCost: number
  recommendationType: string
  reason: string
  /** Biomarker this supplement supports (e.g. Ferritin, Vitamin D); used for affiliate/reorder lookup */
  marker?: string
}

/** Stack snapshot stored with each bloodwork save */
export type BloodworkStackSnapshot = {
  stack: SavedSupplementStackItem[]
  totalMonthlyCost?: number
}

export type BloodworkSaveRow = {
  id?: string
  user_id: string
  selected_panel: string[]
  biomarker_inputs: Record<string, string | number>
  current_step: number
  score?: number | null
  detected_patterns?: BloodworkDetectedPattern[] | null
  key_flagged_biomarkers?: string[] | null
  stack_snapshot: BloodworkStackSnapshot | Record<string, unknown>
  savings_snapshot: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type SavedState = {
  profile: ProfileRow | null
  bloodwork: BloodworkSaveRow | null
}

/** Per-supplement inventory for run-out tracking and reorder reminders. */
export type SupplementInventoryRow = {
  id?: string
  user_id: string
  supplement_name: string
  pills_per_bottle: number
  dose_per_day: number
  opened_at: string
  created_at?: string
  updated_at?: string
}

/** Compute run-out date from opened_at + (pills_per_bottle / dose_per_day) days. */
export function getRunOutDate(openedAt: string, pillsPerBottle: number, dosePerDay: number): string {
  const opened = new Date(openedAt)
  if (dosePerDay <= 0) return openedAt
  const daysSupply = Math.floor(pillsPerBottle / dosePerDay)
  const runOut = new Date(opened)
  runOut.setDate(runOut.getDate() + daysSupply)
  return runOut.toISOString().slice(0, 10)
}

/** Days until run-out (negative = already run out). */
export function getDaysUntilRunOut(runOutDate: string): number {
  const runOut = new Date(runOutDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  runOut.setHours(0, 0, 0, 0)
  return Math.ceil((runOut.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export type SubscriptionRow = {
  id?: string
  user_id: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  status: string
  current_period_end?: string | null
  created_at?: string
  updated_at?: string
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data as SubscriptionRow | null
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data as ProfileRow | null
}

export async function upsertProfile(
  userId: string,
  profile: Omit<ProfileRow, "user_id" | "updated_at">
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      age: profile.age ?? "",
      sex: profile.sex ?? "",
      sport: profile.sport ?? "",
      goal: profile.goal ?? "",
      current_supplement_spend: profile.current_supplement_spend ?? "",
      current_supplements: profile.current_supplements ?? "",
      shopping_preference: profile.shopping_preference ?? "Best value",
      email: profile.email ?? undefined,
      phone: profile.phone ?? undefined,
      retest_weeks: profile.retest_weeks ?? undefined,
      improvement_preference: profile.improvement_preference ?? "",
      profile_type: profile.profile_type ?? undefined,
      height_cm: profile.height_cm ?? undefined,
      weight_kg: profile.weight_kg ?? undefined,
      supplement_form_preference: profile.supplement_form_preference ?? "any",
      diet_preference: profile.diet_preference ?? undefined,
      streak_milestones: profile.streak_milestones ?? undefined,
      daily_reminder: profile.daily_reminder ?? undefined,
      score_goal: profile.score_goal ?? undefined,
      notify_reorder_email: profile.notify_reorder_email ?? undefined,
      notify_reorder_days: profile.notify_reorder_days ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}

export async function getLatestBloodwork(
  userId: string
): Promise<BloodworkSaveRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("bloodwork_saves")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as BloodworkSaveRow | null
}

/** Fetch saved bloodwork panels for Previous Reports (newest first). */
export async function getBloodworkHistory(
  userId: string,
  limit = 20
): Promise<BloodworkSaveRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("bloodwork_saves")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as BloodworkSaveRow[]
}

export async function saveBloodwork(
  userId: string,
  payload: Omit<BloodworkSaveRow, "user_id" | "id" | "created_at" | "updated_at">
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase.from("bloodwork_saves").insert({
    user_id: userId,
    selected_panel: payload.selected_panel ?? [],
    biomarker_inputs: payload.biomarker_inputs ?? {},
    current_step: payload.current_step ?? 1,
    score: payload.score ?? null,
    detected_patterns: payload.detected_patterns ?? [],
    key_flagged_biomarkers: payload.key_flagged_biomarkers ?? [],
    stack_snapshot: payload.stack_snapshot ?? {},
    savings_snapshot: payload.savings_snapshot ?? {},
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function loadSavedState(userId: string): Promise<SavedState> {
  const [profile, bloodwork] = await Promise.all([
    getProfile(userId),
    getLatestBloodwork(userId),
  ])
  return { profile, bloodwork }
}

/** Get protocol log for a date. */
export async function getProtocolLog(
  userId: string,
  logDate: string
): Promise<Record<string, boolean>> {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from("protocol_log")
    .select("checks")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle()
  if (error) throw error
  if (!data?.checks || typeof data.checks !== "object") return {}
  return data.checks as Record<string, boolean>
}

/** Get protocol log entries for the last N days (for streak and weekly summary). */
export async function getProtocolLogHistory(
  userId: string,
  lastNDays: number = 14
): Promise<{ log_date: string; checks: Record<string, boolean> }[]> {
  if (!supabase) return []
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - lastNDays)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("protocol_log")
    .select("log_date, checks")
    .eq("user_id", userId)
    .gte("log_date", startStr)
    .lte("log_date", endStr)
    .order("log_date", { ascending: false })
  if (error) throw error
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    log_date: row.log_date,
    checks: (row.checks as Record<string, boolean>) || {},
  }))
}

/** Check if user has purchased a protocol (client or server with supabase client). */
export async function getProtocolPurchase(
  userId: string,
  protocolSlug: string
): Promise<{ user_id: string; protocol_slug: string; purchased_at: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("user_protocol_purchases")
    .select("user_id, protocol_slug, purchased_at")
    .eq("user_id", userId)
    .eq("protocol_slug", protocolSlug)
    .maybeSingle()
  if (error) throw error
  return data as { user_id: string; protocol_slug: string; purchased_at: string } | null
}

/** Upsert protocol log for a date. */
export async function upsertProtocolLog(
  userId: string,
  logDate: string,
  checks: Record<string, boolean>
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase.from("protocol_log").upsert(
    { user_id: userId, log_date: logDate, checks, updated_at: now },
    { onConflict: "user_id,log_date" }
  )
  if (error) throw error
}

/** Get all supplement inventory rows for a user. */
export async function getSupplementInventory(userId: string): Promise<SupplementInventoryRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("supplement_inventory")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    supplement_name: row.supplement_name,
    pills_per_bottle: Number(row.pills_per_bottle) || 60,
    dose_per_day: Number(row.dose_per_day) || 1,
    opened_at: row.opened_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as SupplementInventoryRow[]
}

/** Upsert a single supplement inventory row (by user_id + supplement_name). */
export async function upsertSupplementInventory(
  userId: string,
  row: Omit<SupplementInventoryRow, "user_id" | "id" | "created_at" | "updated_at">
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const payload = {
    user_id: userId,
    supplement_name: row.supplement_name,
    pills_per_bottle: row.pills_per_bottle,
    dose_per_day: row.dose_per_day,
    opened_at: row.opened_at,
    updated_at: now,
  }
  const { error } = await supabase.from("supplement_inventory").upsert(payload, {
    onConflict: "user_id,supplement_name",
  })
  if (error) throw error
}
