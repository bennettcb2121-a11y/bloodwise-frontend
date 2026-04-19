/**
 * Clarion+ / analysis paywall: who can use dashboard analysis features without paying again.
 *
 * In development, set NEXT_PUBLIC_DEV_SKIP_PAYWALL=1 to bypass the paywall (legacy local testing).
 * Otherwise dev behaves like production so you can test checkout and unlock codes.
 *
 * - **Dashboard access** (`hasClarionAnalysisAccess`): Clarion Lite, Clarion+, $49 analysis, or legacy bloodwork.
 * - **Lab personalization** (`hasLabPersonalizationAccess`): $49 analysis unlock or saved bloodwork with panel/score — not symptom-only Lite.
 */

export function isDevPaywallBypass(): boolean {
  if (typeof process === "undefined") return false
  if (process.env.NODE_ENV !== "development") return false
  return process.env.NEXT_PUBLIC_DEV_SKIP_PAYWALL === "1"
}

export type ProfileLike = {
  analysis_purchased_at?: string | null
  plan_tier?: string | null
} | null
export type SubscriptionLike = { status?: string | null } | null

/** Stripe statuses where the customer still has subscription access (invoice may be past due). */
export function subscriptionStatusGrantsAccess(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase()
  return s === "active" || s === "trialing" || s === "past_due"
}

/** Active Clarion recurring subscription (Stripe row). */
export function hasActiveStripeSubscription(subscription: SubscriptionLike): boolean {
  return subscriptionStatusGrantsAccess(subscription?.status)
}
export type BloodworkLike = {
  score?: number | null
  selected_panel?: unknown
} | null

/** True if user has paid analysis, active subscription (Lite or full), or legacy saved bloodwork. */
export function hasClarionAnalysisAccess(
  profile: ProfileLike,
  subscription: SubscriptionLike,
  bloodwork: BloodworkLike
): boolean {
  if (isDevPaywallBypass()) return true
  if (profile?.analysis_purchased_at) return true
  if (subscriptionStatusGrantsAccess(subscription?.status)) return true
  /** Stripe webhook sets `plan_tier` on profiles; `subscriptions` row can lag behind checkout redirect. */
  const tier = (profile?.plan_tier ?? "").toLowerCase()
  if (tier === "full" || tier === "lite") return true
  if (bloodwork) {
    if (bloodwork.score != null) return true
    const panel = bloodwork.selected_panel
    if (Array.isArray(panel) && panel.length > 0) return true
  }
  return false
}

/**
 * Lab-backed features: panel score from real markers, biomarker trends, lab-matched supplement recs.
 * Clarion Lite alone does not grant this — user needs analysis purchase or saved bloodwork.
 */
export function hasLabPersonalizationAccess(profile: ProfileLike, bloodwork: BloodworkLike): boolean {
  if (isDevPaywallBypass()) return true
  if (profile?.analysis_purchased_at) return true
  if (!bloodwork) return false
  if (bloodwork.score != null) return true
  const panel = bloodwork.selected_panel
  if (Array.isArray(panel) && panel.length > 0) return true
  return false
}

/** Active Stripe subscription is Clarion Lite (symptom/profile tier). */
export function isClarionLitePlan(profile: ProfileLike, subscription: SubscriptionLike): boolean {
  if (isDevPaywallBypass()) return false
  const subActive = subscriptionStatusGrantsAccess(subscription?.status)
  return Boolean(subActive && profile?.plan_tier === "lite")
}

/** Show CTAs to add bloodwork / buy full analysis when user has dashboard access but no lab data yet. */
export function shouldShowLabUpgradePrompt(
  profile: ProfileLike,
  subscription: SubscriptionLike,
  bloodwork: BloodworkLike
): boolean {
  if (!hasClarionAnalysisAccess(profile, subscription, bloodwork)) return false
  return !hasLabPersonalizationAccess(profile, bloodwork)
}
