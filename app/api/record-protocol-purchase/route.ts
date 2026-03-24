import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"

/** After Stripe Checkout success, verify session and record protocol purchase. */
export async function POST(req: NextRequest) {
  let body: { session_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : ""
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession()
  if (!authSession?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  try {
    const stripe = new Stripe(stripeSecretKey)
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }
    const slug = checkoutSession.metadata?.protocol_slug
    const userId = checkoutSession.metadata?.user_id ?? checkoutSession.client_reference_id
    if (!slug || userId !== authSession.user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 })
    }

    const { error } = await supabase.from("user_protocol_purchases").upsert(
      {
        user_id: authSession.user.id,
        protocol_slug: slug,
        stripe_payment_id: checkoutSession.payment_intent?.toString() ?? checkoutSession.id,
        purchased_at: new Date().toISOString(),
      },
      { onConflict: "user_id,protocol_slug" }
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, slug })
  } catch (e) {
    console.error("Record protocol purchase error:", e)
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
  }
}
