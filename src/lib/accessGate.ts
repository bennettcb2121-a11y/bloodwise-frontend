/**
 * Clarion+ / analysis paywall: who can use dashboard analysis features without paying again.
 *
 * In development, set NEXT_PUBLIC_DEV_SKIP_PAYWALL=1 to bypass the paywall (legacy local testing).
 * Otherwise dev behaves like production so you can test checkout and unlock codes.
 */

export function isDevPaywallBypass(): boolean {
  if (typeof process === "undefined") return false
  if (process.env.NODE_ENV !== "development") return false
  return process.env.NEXT_PUBLIC_DEV_SKIP_PAYWALL === "1"
}

export type ProfileLike = { analysis_purchased_at?: string | null } | null
export type SubscriptionLike = { status?: string | null } | null
export type BloodworkLike = {
  score?: number | null
  selected_panel?: unknown
} | null

/** True if user has paid analysis, active subscription, or legacy saved bloodwork (entered before paywall). */
export function hasClarionAnalysisAccess(
  profile: ProfileLike,
  subscription: SubscriptionLike,
  bloodwork: BloodworkLike
): boolean {
  if (isDevPaywallBypass()) return true
  if (profile?.analysis_purchased_at) return true
  const st = subscription?.status
  if (st === "active" || st === "trialing") return true
  if (bloodwork) {
    if (bloodwork.score != null) return true
    const panel = bloodwork.selected_panel
    if (Array.isArray(panel) && panel.length > 0) return true
  }
  return false
}
