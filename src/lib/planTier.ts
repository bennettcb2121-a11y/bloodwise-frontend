/**
 * Clarion subscription tier from Stripe Price IDs (Lite vs Clarion+).
 * Lab/paid surfaces are gated by `analysis_purchased_at` — see `accessGate`.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

export type PlanTier = "none" | "lite" | "full"

/** Resolve tier from a Stripe subscription item price id. Unknown prices default to `full` (Clarion+ compatibility). */
export function resolvePlanTierFromPriceId(priceId: string | undefined): PlanTier {
  if (!priceId) return "none"
  const lite = process.env.STRIPE_LITE_PRICE_ID?.trim()
  const full =
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim() || process.env.STRIPE_PRICE_ID?.trim()
  if (lite && priceId === lite) return "lite"
  if (full && priceId === full) return "full"
  return "full"
}

export function planTierFromSubscriptionStatus(
  status: string,
  priceId: string | undefined
): PlanTier {
  const st = status.toLowerCase()
  if (st !== "active" && st !== "trialing" && st !== "past_due") return "none"
  return resolvePlanTierFromPriceId(priceId)
}

/**
 * Prefer subscription metadata (set at Checkout) so Lite works with inline `price_data` when no STRIPE_LITE_PRICE_ID exists.
 */
export function resolveTierFromStripeSubscription(sub: Stripe.Subscription): PlanTier {
  const st = sub.status
  if (st !== "active" && st !== "trialing" && st !== "past_due") return "none"
  const metaType = sub.metadata?.type
  if (metaType === "lite") return "lite"
  if (metaType === "clarion_plus") return "full"
  const priceId = sub.items.data[0]?.price?.id
  return resolvePlanTierFromPriceId(priceId)
}

/** Sync `profiles.plan_tier` from Stripe after checkout or subscription change. */
export async function syncProfilePlanTierForStripeSubscription(
  supabase: SupabaseClient,
  stripe: Stripe,
  stripeSubscriptionId: string
): Promise<void> {
  const { data: row } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle()

  if (!row?.user_id) return

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const tier = resolveTierFromStripeSubscription(sub)

  await supabase
    .from("profiles")
    .update({ plan_tier: tier, updated_at: new Date().toISOString() })
    .eq("user_id", row.user_id)
}
