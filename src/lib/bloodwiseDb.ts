/**
 * Bloodwise Supabase persistence: profiles and bloodwork saves.
 */

import { supabase } from "./supabase"
import type { DailyMetrics } from "./dailyMetrics"
import { clampDailyMetrics, emptyDailyMetrics } from "./dailyMetrics"

/** PostgREST errors are plain objects; coercing avoids devtools / onUnhandledRejection showing "[object Object]". */
function throwIfError(error: unknown): void {
  if (!error) return
  if (error instanceof Error) throw error
  const o = error as { message?: string; code?: string; details?: string; hint?: string }
  const msg = [o.message, o.code, o.details, o.hint].filter(Boolean).join(" — ") || JSON.stringify(error)
  throw new Error(msg)
}

/** PGRST204: "Could not find the 'col_name' column of 'profiles' in the schema cache" */
function missingColumnFromPostgrestMessage(msg: string): string | null {
  const m = msg.match(/Could not find the '([^']+)' column/)
  return m ? m[1] : null
}

/** Thrown when `supplement_inventory` is missing from the remote DB (migration 013 not applied). */
export class SupplementInventoryUnavailableError extends Error {
  constructor() {
    super(
      "Supply tracking requires the supplement_inventory table. In Supabase: open SQL Editor and run supabase/migrations/013_supplement_inventory.sql, or run `supabase db push` from this repo."
    )
    this.name = "SupplementInventoryUnavailableError"
  }
}

/** PGRST205: table not in PostgREST schema cache (often: migration not applied). */
function isSupplementInventoryTableMissingError(error: unknown): boolean {
  if (!error) return false
  const o = error as { code?: string; message?: string }
  const code = String(o.code ?? "")
  const msg = String(o.message ?? "").toLowerCase()
  if (code === "PGRST205") return true
  if (msg.includes("pgrst205")) return true
  if (msg.includes("supplement_inventory") && (msg.includes("could not find") || msg.includes("schema cache"))) {
    return true
  }
  return false
}

/** Never strip these — they exist on every profiles row from the base schema. */
const PROFILE_UPSERT_CORE_KEYS = new Set([
  "user_id",
  "age",
  "sex",
  "sport",
  "goal",
  "current_supplement_spend",
  "current_supplements",
  "shopping_preference",
  "updated_at",
])

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
  /** Comma-separated symptom ids (e.g. fatigue,low_energy) for priority ranking. */
  symptoms?: string | null
  /** Comma-separated onboarding health goal ids (e.g. more_energy,improve_fitness). */
  health_goals?: string | null
  /** Training / athlete focus (e.g. endurance_athlete, none) — refines ranges with health goals. */
  training_focus?: string | null
  /** Survey: activity tier (e.g. sedentary, light, moderate, very_active). */
  activity_level?: string | null
  /** Survey: typical nightly sleep band (e.g. under_6, 6_7, 7_8, 8_plus). */
  sleep_hours_band?: string | null
  /** Survey: exercises regularly (Yes / No). */
  exercise_regularly?: string | null
  /** Survey: alcohol frequency (e.g. no, occasionally, regularly). */
  alcohol_frequency?: string | null
  /** Stripe subscription tier: none | lite | full (webhook-synced from price id). */
  plan_tier?: string | null
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
  /** UI badge: optional maintenance when labs are optimal but context still suggests monitoring */
  stackHint?: "maintenance"
  /** Stable id from profile JSON when this row came from "what you take today" */
  stackEntryId?: string
  /** Product link from profile editor (reorder / context) */
  productUrl?: string
  /** Lab fit hint from guided intake (profile-sourced rows). */
  fitStatus?: "aligned" | "suboptimal" | "unknown"
  /** User kept their product despite Clarion suggesting a different fit. */
  userChoseKeepProduct?: boolean
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
  throwIfError(error)
  return data as SubscriptionRow | null
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  throwIfError(error)
  return data as ProfileRow | null
}

export async function upsertProfile(
  userId: string,
  profile: Omit<ProfileRow, "user_id" | "updated_at">
): Promise<void> {
  if (!supabase) return
  const payload: Record<string, unknown> = {
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
    symptoms: profile.symptoms ?? undefined,
    health_goals: profile.health_goals ?? undefined,
    training_focus: profile.training_focus ?? undefined,
    plan_tier: profile.plan_tier ?? undefined,
    activity_level: profile.activity_level ?? undefined,
    sleep_hours_band: profile.sleep_hours_band ?? undefined,
    exercise_regularly: profile.exercise_regularly ?? undefined,
    alcohol_frequency: profile.alcohol_frequency ?? undefined,
    updated_at: new Date().toISOString(),
  }
  let { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" })
  for (let attempt = 0; attempt < 16 && error; attempt++) {
    const msg = String((error as { message?: string }).message ?? "")
    if (!/PGRST204|schema cache/i.test(msg)) break
    const col = missingColumnFromPostgrestMessage(msg)
    if (!col || !Object.prototype.hasOwnProperty.call(payload, col) || PROFILE_UPSERT_CORE_KEYS.has(col)) break
    delete payload[col]
    ;({ error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }))
  }
  throwIfError(error)
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
  throwIfError(error)
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
  throwIfError(error)
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
  throwIfError(error)
}

/** Update latest bloodwork row’s stack (e.g. derive recommendations on dashboard when snapshot was empty). */
export async function updateLatestBloodworkStackSnapshot(
  userId: string,
  stack_snapshot: BloodworkStackSnapshot | Record<string, unknown>,
  savings_snapshot?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return
  const latest = await getLatestBloodwork(userId)
  if (!latest?.id) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("bloodwork_saves")
    .update({
      stack_snapshot,
      ...(savings_snapshot !== undefined ? { savings_snapshot } : {}),
      updated_at: now,
    })
    .eq("id", latest.id)
  throwIfError(error)
}

export async function loadSavedState(userId: string): Promise<SavedState> {
  const [profile, bloodwork] = await Promise.all([
    getProfile(userId),
    getLatestBloodwork(userId),
  ])
  return { profile, bloodwork }
}

function parseMetricsFromDb(raw: unknown): DailyMetrics {
  if (!raw || typeof raw !== "object") return emptyDailyMetrics()
  return clampDailyMetrics(raw as Partial<DailyMetrics>)
}

/** Checks + optional daily metrics for one day (between-labs tracking). */
export async function getProtocolLogRow(
  userId: string,
  logDate: string
): Promise<{ checks: Record<string, boolean>; metrics: DailyMetrics }> {
  if (!supabase) return { checks: {}, metrics: emptyDailyMetrics() }
  const { data, error } = await supabase
    .from("protocol_log")
    .select("checks, metrics")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle()
  throwIfError(error)
  const checks =
    data?.checks && typeof data.checks === "object" ? (data.checks as Record<string, boolean>) : {}
  const metrics = parseMetricsFromDb(data?.metrics)
  return { checks, metrics }
}

/** Get protocol log for a date (supplement checkboxes only). */
export async function getProtocolLog(
  userId: string,
  logDate: string
): Promise<Record<string, boolean>> {
  const row = await getProtocolLogRow(userId, logDate)
  return row.checks
}

/** Get protocol log entries for the last N days (for streak and weekly summary). */
export async function getProtocolLogHistory(
  userId: string,
  lastNDays: number = 14
): Promise<{ log_date: string; checks: Record<string, boolean>; metrics: DailyMetrics }[]> {
  if (!supabase) return []
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - lastNDays)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("protocol_log")
    .select("log_date, checks, metrics")
    .eq("user_id", userId)
    .gte("log_date", startStr)
    .lte("log_date", endStr)
    .order("log_date", { ascending: false })
  throwIfError(error)
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    log_date: row.log_date,
    checks: (row.checks as Record<string, boolean>) || {},
    metrics: parseMetricsFromDb(row.metrics),
  }))
}

/** Protocol checks + metrics for an inclusive date range (used by the Logbook calendar). */
export async function getProtocolLogChecksInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ log_date: string; checks: Record<string, boolean> }[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("protocol_log")
    .select("log_date, checks")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: true })
  throwIfError(error)
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    log_date: row.log_date,
    checks: (row.checks as Record<string, boolean>) || {},
  }))
}

/** Daily metrics rows in an inclusive date range (for between-panel habit averages). */
export async function getProtocolLogMetricsInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ log_date: string; metrics: DailyMetrics }[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("protocol_log")
    .select("log_date, metrics")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: true })
  throwIfError(error)
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    log_date: row.log_date,
    metrics: parseMetricsFromDb(row.metrics),
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
  throwIfError(error)
  return data as { user_id: string; protocol_slug: string; purchased_at: string } | null
}

/** Upsert protocol log for a date (preserves existing metrics). */
export async function upsertProtocolLog(
  userId: string,
  logDate: string,
  checks: Record<string, boolean>
): Promise<void> {
  if (!supabase) return
  const { metrics } = await getProtocolLogRow(userId, logDate)
  const now = new Date().toISOString()
  const { error } = await supabase.from("protocol_log").upsert(
    { user_id: userId, log_date: logDate, checks, metrics: metrics as Record<string, unknown>, updated_at: now },
    { onConflict: "user_id,log_date" }
  )
  throwIfError(error)
}

/** Replace daily self-reported metrics for a date (preserves supplement checks). */
export async function upsertProtocolMetrics(
  userId: string,
  logDate: string,
  metrics: DailyMetrics
): Promise<void> {
  if (!supabase) return
  const { checks } = await getProtocolLogRow(userId, logDate)
  const m = clampDailyMetrics(metrics)
  const now = new Date().toISOString()
  const { error } = await supabase.from("protocol_log").upsert(
    {
      user_id: userId,
      log_date: logDate,
      checks,
      metrics: m as Record<string, unknown>,
      updated_at: now,
    },
    { onConflict: "user_id,log_date" }
  )
  throwIfError(error)
}

/** ───────────────────────── Lab uploads (migration 022) ─────────────────────────
 *
 * These helpers are read-only facades over the lab upload tables created by
 * migration 022_lab_uploads.sql. Writes happen on the server routes
 * (/api/labs/extract, /api/labs/confirm) because they are consent-gated and
 * coordinate with Supabase Storage. The dashboard only needs to read.
 */

export type LabUploadSessionRow = {
  id: string
  user_id: string
  label: string
  collected_at: string | null
  status: "uploading" | "extracting" | "confirming" | "confirmed" | "discarded"
  file_count: number
  extraction_model: string
  extraction_error: string
  raw_deleted_at: string | null
  created_at: string
  updated_at: string
}

export type LabBiomarkerValueRow = {
  id: string
  user_id: string
  session_id: string | null
  biomarker_key: string
  value: number
  unit: string
  collected_at: string | null
  confidence: number | null
  flag: string | null
  created_at: string
}

export async function getLabSessions(userId: string, limit = 20): Promise<LabUploadSessionRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("lab_upload_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) {
    // Migration 022 may not be applied yet — return empty silently so the rest of the UI still renders.
    const code = String((error as { code?: string }).code ?? "")
    if (code === "PGRST205" || String(error.message ?? "").includes("lab_upload_sessions")) return []
    throwIfError(error)
  }
  return (data ?? []) as LabUploadSessionRow[]
}

export async function getLatestLabBiomarkerValues(
  userId: string,
  sinceDays = 365
): Promise<LabBiomarkerValueRow[]> {
  if (!supabase) return []
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from("lab_biomarker_values")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
  if (error) {
    const code = String((error as { code?: string }).code ?? "")
    if (code === "PGRST205" || String(error.message ?? "").includes("lab_biomarker_values")) return []
    throwIfError(error)
  }
  return (data ?? []) as LabBiomarkerValueRow[]
}

/** Keep only the most recent value per biomarker_key. */
export function collapseToLatestPerBiomarker(
  rows: LabBiomarkerValueRow[]
): Record<string, LabBiomarkerValueRow> {
  const out: Record<string, LabBiomarkerValueRow> = {}
  const sorted = [...rows].sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
  for (const r of sorted) {
    if (!(r.biomarker_key in out)) out[r.biomarker_key] = r
  }
  return out
}

/** Get all supplement inventory rows for a user. */
export async function getSupplementInventory(userId: string): Promise<SupplementInventoryRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("supplement_inventory")
    .select("*")
    .eq("user_id", userId)
  if (error && isSupplementInventoryTableMissingError(error)) return []
  throwIfError(error)
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
  if (error && isSupplementInventoryTableMissingError(error)) {
    throw new SupplementInventoryUnavailableError()
  }
  throwIfError(error)
}
