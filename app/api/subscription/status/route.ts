/**
 * Read Clarion+ subscription status for the current user.
 *
 * Returns a consolidated view combining our `subscriptions` row with live Stripe state
 * (needed for `cancel_at_period_end`, which the webhook does persist via the `status`
 * transition but which we don't mirror as a standalone column today).
 *
 * Response shape:
 *   {
 *     hasSubscription: boolean,
 *     status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused" | "inactive",
 *     cancel_at_period_end: boolean,
 *     current_period_end: string | null,   // ISO
 *     trial_end: string | null,            // ISO; null if not in trial
 *     analysis_purchased_at: string | null // ISO from profiles — whether $49 has been paid
 *   }
 */

import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 })
  }

  const [{ data: subRow }, { data: profileRow }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("analysis_purchased_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  const analysisPurchasedAt =
    (profileRow?.analysis_purchased_at as string | null | undefined) ?? null

  if (!subRow || !subRow.stripe_subscription_id) {
    return NextResponse.json({
      hasSubscription: false,
      status: "inactive",
      cancel_at_period_end: false,
      current_period_end: null,
      trial_end: null,
      analysis_purchased_at: analysisPurchasedAt,
    })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    // Stripe not configured — fall back to DB-only view.
    return NextResponse.json({
      hasSubscription: true,
      status: subRow.status ?? "inactive",
      cancel_at_period_end: false,
      current_period_end: subRow.current_period_end ?? null,
      trial_end: null,
      analysis_purchased_at: analysisPurchasedAt,
    })
  }

  const stripe = new Stripe(stripeSecretKey)
  try {
    const live = (await stripe.subscriptions.retrieve(subRow.stripe_subscription_id)) as
      Stripe.Subscription & { current_period_end?: number; trial_end?: number | null }
    const currentPeriodEnd =
      typeof live.current_period_end === "number"
        ? new Date(live.current_period_end * 1000).toISOString()
        : (subRow.current_period_end ?? null)
    const trialEnd =
      typeof live.trial_end === "number" ? new Date(live.trial_end * 1000).toISOString() : null
    return NextResponse.json({
      hasSubscription: true,
      status: live.status,
      cancel_at_period_end: live.cancel_at_period_end === true,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
      analysis_purchased_at: analysisPurchasedAt,
    })
  } catch (err) {
    // If Stripe lookup fails (deleted sub, network), fall back to DB snapshot so the UI
    // still renders something sensible.
    console.warn("[subscription/status] stripe retrieve failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({
      hasSubscription: true,
      status: subRow.status ?? "inactive",
      cancel_at_period_end: false,
      current_period_end: subRow.current_period_end ?? null,
      trial_end: null,
      analysis_purchased_at: analysisPurchasedAt,
    })
  }
}
