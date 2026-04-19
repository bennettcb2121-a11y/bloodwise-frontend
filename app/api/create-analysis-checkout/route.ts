import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"

/**
 * Clarion analysis: $49 one-time (Stripe Checkout payment).
 * Webhook then attaches Clarion+ subscription ($29 every 2 months) with trial_period_days = 60.
 * Active/trialing subscribers skip this checkout — new bloodwork has no extra analysis fee.
 *
 * Optional JSON body: `{ tier?: "analysis" | "monthly" }` — purely a funnel-attribution marker
 * for which framing/CTA the user clicked (Tier 2 "one-time analysis" vs Tier 3 "Clarion Monthly").
 * The underlying offer is identical today; `tier` is stored in Stripe metadata as `source_tier`
 * so we can slice conversion by CTA in Stripe/analytics.
 */
type SourceTier = "analysis" | "monthly"

function parseSourceTier(raw: unknown): SourceTier {
  return raw === "monthly" ? "monthly" : "analysis"
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession()

  if (!authSession?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const userId = authSession.user.id

  // Body is optional; ignore parse errors so existing callers sending no body still work.
  let sourceTier: SourceTier = "analysis"
  try {
    const text = await request.text()
    if (text.trim()) {
      const parsed = JSON.parse(text) as { tier?: unknown }
      sourceTier = parseSourceTier(parsed?.tier)
    }
  } catch {
    // keep default
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY)" },
      { status: 500 }
    )
  }

  let origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim()
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) origin = `https://${origin}`

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle()

  const subStatus = existingSub?.status as string | undefined
  if (subStatus === "active" || subStatus === "trialing") {
    return NextResponse.json({
      skipCheckout: true,
      url: `${origin}/?paid=1&subscriber=1`,
      message: "You already have Clarion+ — add new labs anytime with no extra analysis fee.",
    })
  }

  const analysisPriceId = process.env.STRIPE_ANALYSIS_PRICE_ID

  const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = analysisPriceId
    ? [{ price: analysisPriceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "usd",
            unit_amount: 4900, // $49.00
            product_data: {
              name: "Clarion Analysis",
              description:
                "One-time biomarker analysis. Clarion+ ($29 every 2 months) starts after a 2-month included period — see checkout terms.",
              images: undefined,
            },
          },
          quantity: 1,
        },
      ]

  try {
    const stripe = new Stripe(stripeSecretKey)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: `${origin}/?paid=1`,
      cancel_url: `${origin}/paywall`,
      client_reference_id: userId,
      customer_email: authSession.user.email ?? undefined,
      metadata: { user_id: userId, type: "analysis", source_tier: sourceTier },
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
