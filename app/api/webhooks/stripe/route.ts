import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 400 })
  }
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey || !supabaseUrl) {
    console.error("STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY not set; cannot update subscriptions table")
    return NextResponse.json({ received: true })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = (session.client_reference_id ?? session.metadata?.user_id) as string | undefined
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      const mode = session.mode

      // One-time analysis purchase: set profiles.analysis_purchased_at and auto-enroll in Clarion+ with 2 months free
      if (mode === "payment" && userId && session.metadata?.type === "analysis") {
        const now = new Date().toISOString()
        await supabase.from("profiles").upsert(
          {
            user_id: userId,
            analysis_purchased_at: now,
            updated_at: now,
          },
          { onConflict: "user_id" }
        )
        // Automatically create Clarion+ subscription with 2-month free trial (same customer from checkout)
        const customerId = typeof session.customer === "string" ? session.customer : null
        const subscriptionPriceId = process.env.STRIPE_PRICE_ID
        if (customerId && subscriptionPriceId) {
          try {
            const { data: existing } = await supabase.from("subscriptions").select("user_id").eq("user_id", userId).maybeSingle()
            if (!existing) {
              const sub = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: subscriptionPriceId }],
                trial_period_days: 60,
                metadata: { user_id: userId },
              })
              const periodEnd = typeof sub.current_period_end === "number"
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null
              await supabase.from("subscriptions").upsert(
                {
                  user_id: userId,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: sub.id,
                  status: sub.status,
                  current_period_end: periodEnd,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              )
            }
          } catch (err) {
            console.error("Stripe: auto-create subscription with trial after $49 analysis failed:", err)
          }
        }
      }

      // Subscription: update subscriptions table
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription & { current_period_end?: number }
        const subUserId = sub.metadata?.user_id || userId
        const periodEnd = typeof sub.current_period_end === "number"
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
        await supabase.from("subscriptions").upsert(
          {
            user_id: subUserId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: sub.status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
      }
      break
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number }
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status
      const periodEnd = typeof sub.current_period_end === "number"
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null
      await supabase
        .from("subscriptions")
        .update({
          status,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id)
      break
    }
    default:
      // Unhandled event type
      break
  }

  return NextResponse.json({ received: true })
}
