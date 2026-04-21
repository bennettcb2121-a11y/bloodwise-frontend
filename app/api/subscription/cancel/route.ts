/**
 * Cancel Clarion+ subscription.
 *
 * IMPORTANT product rule:
 *   The $49 one-time analysis is permanent and independent of the subscription. Canceling
 *   here ONLY affects the $29 / 2-month Clarion+ add-on. It does NOT refund the $49,
 *   it does NOT revoke access to the user's past report, and it does NOT delete their
 *   data. Never word this endpoint's responses as if a cancel removes the analysis.
 *
 * Behavior:
 *   - Sets `cancel_at_period_end = true` on the Stripe subscription. The user keeps
 *     access until `current_period_end`:
 *       - If the sub is `trialing` (still inside the 2-month included period), they
 *         keep the trial, and Stripe will NOT charge them at the end — the sub just
 *         ends cleanly.
 *       - If the sub is `active` (paid period), they keep access until the current
 *         paid period ends, then the sub ends.
 *   - The Stripe webhook (`customer.subscription.updated`) then syncs our
 *     `subscriptions` and `profiles.plan_tier` rows.
 *
 * Body: none.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"

export const runtime = "nodejs"

const cancelRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 10 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!cancelRateLimiter.allow(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly.", code: "rate_limited" },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured.", code: "no_stripe" },
      { status: 500 }
    )
  }

  const { data: subRow, error: subErr } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle()

  if (subErr) {
    return NextResponse.json(
      { error: "Could not look up subscription.", detail: subErr.message },
      { status: 500 }
    )
  }
  if (!subRow || !subRow.stripe_subscription_id) {
    return NextResponse.json(
      { error: "No active Clarion+ subscription found.", code: "no_subscription" },
      { status: 404 }
    )
  }
  const status = String(subRow.status ?? "").toLowerCase()
  if (status === "canceled" || status === "incomplete_expired") {
    return NextResponse.json({
      ok: true,
      alreadyCanceled: true,
      message: "Your subscription is already canceled.",
    })
  }

  const stripe = new Stripe(stripeSecretKey)
  try {
    const updated = (await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: {
        canceled_by: "user_self_service",
        canceled_from: "settings_page",
      },
    })) as Stripe.Subscription & { current_period_end?: number; cancel_at?: number | null }

    const periodEnd =
      typeof updated.current_period_end === "number"
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null

    return NextResponse.json({
      ok: true,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end === true,
      current_period_end: periodEnd,
      was_trialing: status === "trialing",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe cancel failed"
    console.error("[subscription/cancel] failed", { userId: user.id, error: message })
    return NextResponse.json({ error: message, code: "stripe_error" }, { status: 500 })
  }
}
