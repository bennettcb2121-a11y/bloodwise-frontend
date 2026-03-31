import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"
import { LITE_DEFAULT_PRICE_CENTS } from "@/src/lib/analysisPricing"

/**
 * Clarion Lite: lower recurring price, symptom/profile-based guidance (no lab unlock).
 * Uses STRIPE_LITE_PRICE_ID when set; otherwise creates a monthly price inline (same pattern as analysis checkout).
 * Webhook sets profiles.plan_tier from subscription metadata `type: lite`.
 */
function liteCheckoutUnitAmountCents(): number {
  const raw = process.env.NEXT_PUBLIC_LITE_PRICE_CENTS
  const n = raw != null && raw !== "" ? Number.parseInt(String(raw), 10) : LITE_DEFAULT_PRICE_CENTS
  if (!Number.isFinite(n) || n < 50) return LITE_DEFAULT_PRICE_CENTS
  return n
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "Clarion Lite checkout needs STRIPE_SECRET_KEY in the server environment (same as other Stripe routes). Add it for Production and redeploy.",
        },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey)
    let origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim()
    if (!origin.startsWith("http://") && !origin.startsWith("https://")) origin = `https://${origin}`

    const priceId = process.env.STRIPE_LITE_PRICE_ID?.trim()
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] =
      priceId && priceId.startsWith("price_")
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "usd",
                unit_amount: liteCheckoutUnitAmountCents(),
                recurring: { interval: "month" },
                product_data: {
                  name: "Clarion Lite",
                  description: "Monthly symptom and profile guidance — education only, not a substitute for medical care.",
                },
              },
              quantity: 1,
            },
          ]

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      success_url: `${origin}/dashboard?lite=success`,
      cancel_url: `${origin}/paywall?lite=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      subscription_data: {
        metadata: { user_id: user.id, type: "lite" },
      },
      metadata: { user_id: user.id, type: "lite_checkout" },
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 })
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (e) {
    const message =
      e instanceof Stripe.errors.StripeError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Clarion Lite checkout failed"
    const isMissingPrice =
      e instanceof Stripe.errors.StripeError &&
      (e.code === "resource_missing" || /no such price/i.test(message))
    const hint = isMissingPrice
      ? " Your STRIPE_LITE_PRICE_ID must be created in the same Stripe mode as STRIPE_SECRET_KEY: with sk_test_… use a Price from Dashboard with Test mode ON; with sk_live_… use a Live price."
      : ""
    return NextResponse.json({ error: `${message}${hint}` }, { status: 502 })
  }
}
