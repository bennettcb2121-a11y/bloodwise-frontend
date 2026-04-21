/**
 * Delete the current user's account.
 *
 * Required by GDPR (EU) and CCPA (California); also the right thing to do. This is
 * irreversible: after this completes, the user's auth row, profile, bloodwork, logs,
 * lab values, and raw uploads are all gone, and any active Clarion+ subscription is
 * canceled immediately in Stripe (no further charges).
 *
 * Order of operations (important — each step is best-effort but we push through):
 *   1. Cancel the Stripe subscription IMMEDIATELY (not at period end). If we skip this
 *      and Stripe keeps billing after auth.users is deleted, webhooks can't reconcile
 *      because the user_id no longer exists.
 *   2. Remove any remaining raw lab-upload files from storage. DB rows for these will
 *      cascade when auth.users is deleted, but storage is NOT linked by FK — it must
 *      be purged explicitly.
 *   3. Call `supabase.auth.admin.deleteUser(userId)` with the service-role client. This
 *      is the only path that actually deletes from auth.users, which then cascades to
 *      every table via ON DELETE CASCADE (profiles, bloodwork_saves, protocol_log,
 *      supplement_inventory, subscriptions, user_consents, lab_*, etc.).
 *
 * Response: `{ ok: true }` on success. Client must call `signOut()` after to clear the
 * cookie.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/src/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"

export const runtime = "nodejs"

// Per-IP cap. Can be very low because this is a one-shot, per-user action.
const deleteRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 5 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!deleteRateLimiter.allow(ip)) {
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

  // Require typed confirmation so an errant click doesn't nuke an account.
  let body: { confirm?: string } = {}
  try {
    body = (await req.json()) as { confirm?: string }
  } catch {
    // body is optional for the typed-confirmation check below
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Confirmation missing. Send `{ "confirm": "DELETE" }`.', code: "confirm_required" },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[account/delete] SUPABASE_SERVICE_ROLE_KEY not set; cannot delete auth.users")
    return NextResponse.json(
      { error: "Account deletion is not configured on the server.", code: "not_configured" },
      { status: 500 }
    )
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey)

  // --- 1. Cancel Stripe subscription immediately ---
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  let stripeCanceled: boolean | null = null
  let stripeError: string | null = null

  if (stripeSecretKey) {
    const { data: subRow } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle()
    const stripeSubId = subRow?.stripe_subscription_id as string | null | undefined
    const status = String(subRow?.status ?? "").toLowerCase()
    if (stripeSubId && status !== "canceled" && status !== "incomplete_expired") {
      try {
        const stripe = new Stripe(stripeSecretKey)
        // cancel(id) ends immediately. We intentionally don't prorate/refund here —
        // deletion policy is "you lose access right now"; the user accepted that when
        // they typed DELETE.
        await stripe.subscriptions.cancel(stripeSubId)
        stripeCanceled = true
      } catch (err) {
        stripeCanceled = false
        stripeError = err instanceof Error ? err.message : String(err)
        // Do NOT abort — better to finish deleting the account than to leave the user
        // half-deleted because of a Stripe blip. We log loudly so ops can reconcile.
        console.error("[account/delete] stripe cancel failed, continuing with deletion", {
          userId: user.id,
          stripeSubId,
          error: stripeError,
        })
      }
    }
  }

  // --- 2. Purge raw lab-upload storage (storage is not FK-linked, so it would orphan) ---
  let storageError: string | null = null
  try {
    const { data: extractions } = await admin
      .from("lab_extractions")
      .select("storage_path")
      .eq("user_id", user.id)
    const paths = (extractions ?? [])
      .map((r) => r.storage_path as string | null)
      .filter((p): p is string => typeof p === "string" && p.length > 0)
    if (paths.length > 0) {
      const { error: rmErr } = await admin.storage.from("lab-uploads").remove(paths)
      if (rmErr) {
        storageError = rmErr.message
        console.error("[account/delete] storage purge failed, continuing with deletion", {
          userId: user.id,
          pathCount: paths.length,
          error: storageError,
        })
      }
    }
  } catch (err) {
    storageError = err instanceof Error ? err.message : String(err)
    console.error("[account/delete] storage lookup failed, continuing with deletion", {
      userId: user.id,
      error: storageError,
    })
  }

  // --- 3. Delete auth user (cascades to all linked tables) ---
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error("[account/delete] auth.admin.deleteUser failed", {
      userId: user.id,
      error: delErr.message,
    })
    return NextResponse.json(
      { error: "Could not delete account. Please email support@clarionlabs.tech.", detail: delErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    stripeCanceled,
    stripeError,
    storageError,
  })
}
