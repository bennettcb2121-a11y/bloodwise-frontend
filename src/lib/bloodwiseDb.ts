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
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data as SubscriptionRow | null
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}

export async function getLatestBloodwork(
  userId: string
): Promise<BloodworkSaveRow | null> {
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
