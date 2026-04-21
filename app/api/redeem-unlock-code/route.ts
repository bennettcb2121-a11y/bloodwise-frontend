import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { createClient as createSupabase } from "@supabase/supabase-js"

/**
 * Redeem a one-time unlock code.
 *
 * Two code tiers are supported, both comma-separated env vars:
 *   - CLARION_UNLOCK_CODES         → grants the $49 analysis (analysis_purchased_at).
 *   - CLARION_FAMILY_UNLOCK_CODES  → grants full Clarion+ access (analysis + plan_tier='full'),
 *                                    bypassing Stripe entirely. Intended for the founder's
 *                                    family/friends comps so they never get charged.
 *
 * Both lists are one-time-use and recorded in `unlock_redemptions`. If the same code string
 * appears in both lists, family access wins (more permissive).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = (body.code ?? "").trim()
  if (!raw) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const parseCodes = (value: string | undefined) =>
    (value ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)

  const analysisCodes = parseCodes(process.env.CLARION_UNLOCK_CODES)
  const familyCodes = parseCodes(process.env.CLARION_FAMILY_UNLOCK_CODES)
  const normalizedInput = raw.toUpperCase()

  if (!analysisCodes.length && !familyCodes.length) {
    return NextResponse.json(
      {
        error:
          "Unlock codes are not configured. Add CLARION_UNLOCK_CODES or CLARION_FAMILY_UNLOCK_CODES to the server environment (comma-separated codes) and redeploy.",
      },
      { status: 503 }
    )
  }

  // Family codes take precedence when a string appears in both lists.
  const isFamilyCode = familyCodes.includes(normalizedInput)
  const isAnalysisCode = analysisCodes.includes(normalizedInput)

  if (!isFamilyCode && !isAnalysisCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  const serviceKey =
    process.env.STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    )
  }

  const admin = createSupabase(supabaseUrl, serviceKey)

  // Check if code was already redeemed (one-time use)
  const { data: existing } = await admin
    .from("unlock_redemptions")
    .select("id")
    .eq("code", normalizedInput)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: "This code has already been used" },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const userId = session.user.id

  const { error: insertErr } = await admin.from("unlock_redemptions").insert({
    code: normalizedInput,
    user_id: userId,
    redeemed_at: now,
  })

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "This code has already been used" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to redeem code" },
      { status: 500 }
    )
  }

  // Family codes bypass Stripe entirely: we flip plan_tier='full' so accessGate grants
  // Clarion+ features the same way it would for an active subscription. We also set
  // analysis_purchased_at so lab personalization is unlocked and all UI gates pass.
  const profilePayload: Record<string, unknown> = {
    user_id: userId,
    analysis_purchased_at: now,
    updated_at: now,
  }
  if (isFamilyCode) {
    profilePayload.plan_tier = "full"
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "user_id" })

  if (profileErr) {
    return NextResponse.json(
      { error: "Failed to unlock account" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    tier: isFamilyCode ? "family" : "analysis",
  })
}
