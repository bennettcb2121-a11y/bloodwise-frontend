/**
 * Clarion+ / analysis paywall: who can use dashboard analysis features.
 *
 * In development, set NEXT_PUBLIC_DEV_SKIP_PAYWALL=1 to bypass the paywall (legacy local testing).
 *
 * - **$49 first**: A Stripe subscription (trialing / active) alone must NOT unlock the app — users
 *   can subscribe to Clarion+ without the one-time analysis in sandbox or misconfigured checkouts.
 *   Access is based on `profiles.analysis_purchased_at` (set by the $49 checkout, redeem codes, or
 *   admin) — not on `subscriptions.status` or `plan_tier` from Stripe.
 * - **Bloodwork alone** is not proof of payment (same as legacy “grandfather” clause; revoked 2026-04).
 * - **Lab personalization** uses the same purchase signal as the rest of the paid analysis surface.
 */

export function isDevPaywallBypass(): boolean {
  if (typeof process === "undefined") return false
  if (process.env.NODE_ENV !== "development") return false
  return process.env.NEXT_PUBLIC_DEV_SKIP_PAYWALL === "1"
}

/**
 * Onboarding users hit `/labs/upload` before paying; the (clarion-app) paywall must not block that route.
 * `embed=1` is added for a chromeless experience but is not part of the exempt match.
 */
export function isOnboardingLabUploadPath(
  pathname: string,
  searchParams: { get: (name: string) => string | null }
): boolean {
  return (
    (pathname === "/labs/upload" || pathname.startsWith("/labs/upload/")) &&
    searchParams.get("return") === "onboarding"
  )
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

/** True if the $49 (or code) analysis unlock is present. Subscription status does not grant this by itself. */
export function hasClarionAnalysisAccess(
  profile: ProfileLike,
  _subscription: SubscriptionLike,
  _bloodwork: BloodworkLike
): boolean {
  if (isDevPaywallBypass()) return true
  if (profile?.analysis_purchased_at) return true
  return false
}

/**
 * Lab-backed features: panel score from real markers, biomarker trends, lab-matched supplement recs.
 * Requires a paid analysis unlock. A subscription alone (e.g. lite) does not grant this —
 * the $49 analysis unlock is what actually pays for the personalized biomarker work.
 */
export function hasLabPersonalizationAccess(
  profile: ProfileLike,
  _bloodwork: BloodworkLike
): boolean {
  if (isDevPaywallBypass()) return true
  if (profile?.analysis_purchased_at) return true
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
