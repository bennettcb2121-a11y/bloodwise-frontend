/**
 * Undo a pending cancel on Clarion+ subscription.
 *
 * If the user changed their mind AFTER clicking cancel (but BEFORE the period end),
 * this flips `cancel_at_period_end` back to false. Nothing is re-charged — the next
 * billing cycle just resumes on schedule.
 *
 * If the subscription has already ended (`canceled` status), this does NOT restart it;
 * the user must re-subscribe via checkout.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"

export const runtime = "nodejs"

const resumeRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 10 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!resumeRateLimiter.allow(ip)) {
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
      { error: "No Clarion+ subscription found.", code: "no_subscription" },
      { status: 404 }
    )
  }
  const status = String(subRow.status ?? "").toLowerCase()
  if (status === "canceled" || status === "incomplete_expired") {
    return NextResponse.json(
      { error: "Subscription has already ended. Please re-subscribe via checkout.", code: "ended" },
      { status: 409 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  try {
    const updated = (await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      cancel_at_period_end: false,
    })) as Stripe.Subscription & { current_period_end?: number }
    const periodEnd =
      typeof updated.current_period_end === "number"
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null
    return NextResponse.json({
      ok: true,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end === true,
      current_period_end: periodEnd,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe resume failed"
    console.error("[subscription/resume] failed", { userId: user.id, error: message })
    return NextResponse.json({ error: message, code: "stripe_error" }, { status: 500 })
  }
}
