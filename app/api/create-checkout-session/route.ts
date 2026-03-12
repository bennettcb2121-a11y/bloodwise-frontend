import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession()

  if (!authSession?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID
  if (!stripeSecretKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)" },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  let origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim()
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) origin = `https://${origin}`

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?subscription=success`,
    cancel_url: `${origin}/?subscription=cancelled`,
    client_reference_id: authSession.user.id,
    customer_email: authSession.user.email ?? undefined,
    subscription_data: {
      metadata: { user_id: authSession.user.id },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
