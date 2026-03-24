import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"
import { getPaidProtocolBySlug } from "@/src/lib/paidProtocols"

/** One-time payment for a paid protocol (e.g. Iron, Gut health). */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession()

  if (!authSession?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const slug = typeof body?.slug === "string" ? body.slug.trim() : ""
  const protocol = getPaidProtocolBySlug(slug)
  if (!protocol) {
    return NextResponse.json({ error: "Unknown protocol" }, { status: 400 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    )
  }

  let origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim()
  if (!origin.startsWith("http")) origin = `https://${origin}`

  try {
    const stripe = new Stripe(stripeSecretKey)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: protocol.priceCents,
            product_data: {
              name: protocol.title,
              description: protocol.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/protocols/success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(slug)}`,
      cancel_url: `${origin}/protocols/${slug}`,
      client_reference_id: authSession.user.id,
      customer_email: authSession.user.email ?? undefined,
      metadata: {
        user_id: authSession.user.id,
        protocol_slug: slug,
        type: "protocol",
      },
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
