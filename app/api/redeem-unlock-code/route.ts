import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { createClient as createSupabase } from "@supabase/supabase-js"

/** Redeem a one-time free unlock code. Sets analysis_purchased_at for the user. */
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

  const codesEnv = process.env.CLARION_UNLOCK_CODES
  const validCodes = codesEnv
    ? codesEnv.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
    : []
  const normalizedInput = raw.toUpperCase()

  if (!validCodes.length) {
    return NextResponse.json(
      { error: "Unlock codes are not configured" },
      { status: 503 }
    )
  }

  if (!validCodes.includes(normalizedInput)) {
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

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      analysis_purchased_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  )

  if (profileErr) {
    return NextResponse.json(
      { error: "Failed to unlock account" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
