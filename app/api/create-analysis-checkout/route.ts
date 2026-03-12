import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"

/** One-time $49 Clarion Analysis purchase — creates Stripe Checkout session (mode: payment). */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession()

  if (!authSession?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
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
              description: "Unlock your personalized biomarker analysis.",
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
      client_reference_id: authSession.user.id,
      customer_email: authSession.user.email ?? undefined,
      metadata: { user_id: authSession.user.id, type: "analysis" },
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
