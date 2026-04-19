import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { isDuplicateKeyError } from "@/src/lib/stripeWebhookIdempotency"
import { CLARION_SUBSCRIPTION_TRIAL_DAYS } from "@/src/lib/analysisPricing"
import { syncProfilePlanTierForStripeSubscription } from "@/src/lib/planTier"
import { sendAnalysisReportEmail } from "@/src/lib/analysisReportEmail"

async function sendAnalysisReportEmailAfterCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  userId: string
) {
  let to =
    (typeof session.customer_email === "string" && session.customer_email.trim()) ||
    (session.customer_details &&
    typeof session.customer_details.email === "string" &&
    session.customer_details.email.trim()) ||
    ""
  if (!to) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId)
      if (!error && data.user?.email) to = data.user.email.trim()
    } catch {
      // ignore
    }
  }
  if (!to) {
    console.warn("Stripe analysis checkout: no email address for analysis report welcome")
    return
  }
  const result = await sendAnalysisReportEmail({ to })
  if (!result.ok) {
    console.error("sendAnalysisReportEmail after analysis checkout:", result.error)
  }
}

async function processStripeEvent(event: Stripe.Event, stripe: Stripe, supabase: SupabaseClient) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = (session.client_reference_id ?? session.metadata?.user_id) as string | undefined
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      const mode = session.mode

      if (mode === "payment" && userId && session.metadata?.type === "protocol" && session.metadata?.protocol_slug) {
        const slug = String(session.metadata.protocol_slug)
        const paymentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent != null
              ? String(session.payment_intent)
              : session.id
        const now = new Date().toISOString()
        await supabase.from("user_protocol_purchases").upsert(
          {
            user_id: userId,
            protocol_slug: slug,
            stripe_payment_id: paymentId,
            purchased_at: now,
          },
          { onConflict: "user_id,protocol_slug" }
        )
      }

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
        try {
          await sendAnalysisReportEmailAfterCheckout(supabase, session, userId)
        } catch (e) {
          console.error("Stripe: analysis report welcome email failed:", e)
        }
        const customerIdStr = typeof session.customer === "string" ? session.customer : null
        const subscriptionPriceId =
          process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim() || process.env.STRIPE_PRICE_ID?.trim()
        if (customerIdStr && subscriptionPriceId) {
          try {
            const { data: existing } = await supabase.from("subscriptions").select("user_id").eq("user_id", userId).maybeSingle()
            if (!existing) {
              const sourceTier =
                session.metadata?.source_tier === "monthly" ? "monthly" : "analysis"
              const sub = await stripe.subscriptions.create({
                customer: customerIdStr,
                items: [{ price: subscriptionPriceId }],
                trial_period_days: CLARION_SUBSCRIPTION_TRIAL_DAYS,
                metadata: { user_id: userId, type: "clarion_plus", source_tier: sourceTier },
              })
              const subWithPeriod = sub as Stripe.Subscription & { current_period_end?: number }
              const periodEnd =
                typeof subWithPeriod.current_period_end === "number"
                  ? new Date(subWithPeriod.current_period_end * 1000).toISOString()
                  : null
              await supabase.from("subscriptions").upsert(
                {
                  user_id: userId,
                  stripe_customer_id: customerIdStr,
                  stripe_subscription_id: subWithPeriod.id,
                  status: subWithPeriod.status,
                  current_period_end: periodEnd,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              )
              try {
                await syncProfilePlanTierForStripeSubscription(supabase, stripe, subWithPeriod.id)
              } catch (e) {
                console.error("Stripe: sync plan_tier after analysis Clarion+ create:", e)
              }
            }
          } catch (err) {
            console.error("Stripe: auto-create subscription with trial after $49 analysis failed:", err)
          }
        }
      }

      if (userId && subscriptionId) {
        const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription & {
          current_period_end?: number
        }
        const subUserId = sub.metadata?.user_id || userId
        const periodEnd =
          typeof sub.current_period_end === "number" ? new Date(sub.current_period_end * 1000).toISOString() : null
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
        try {
          await syncProfilePlanTierForStripeSubscription(supabase, stripe, subscriptionId)
        } catch (e) {
          console.error("Stripe: sync plan_tier after checkout.session.completed:", e)
        }
      }
      break
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number }
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status
      const periodEnd =
        typeof sub.current_period_end === "number" ? new Date(sub.current_period_end * 1000).toISOString() : null
      await supabase
        .from("subscriptions")
        .update({
          status,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id)
      try {
        await syncProfilePlanTierForStripeSubscription(supabase, stripe, sub.id)
      } catch (e) {
        console.error("Stripe: sync plan_tier after subscription update:", e)
      }
      break
    }
    default:
      break
  }
}

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

  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({ id: event.id, type: event.type })

  if (insertError) {
    if (isDuplicateKeyError(insertError)) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("stripe_webhook_events insert:", insertError)
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 })
  }

  try {
    await processStripeEvent(event, stripe, supabase)
  } catch (e) {
    console.error("Stripe webhook processing error:", e)
    await supabase.from("stripe_webhook_events").delete().eq("id", event.id)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
