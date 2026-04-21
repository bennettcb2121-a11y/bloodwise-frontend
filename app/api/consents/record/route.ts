/**
 * Server-side consent recording.
 *
 * Every affirmative consent is written through this endpoint so that the server (not the
 * client) captures and hashes the IP + User-Agent at the moment of acceptance. Those
 * hashes are the audit trail required by MHMDA and are useful evidence under the FTC
 * Health Breach Notification Rule. Raw values are never stored.
 *
 * POST body: { consentType: ConsentType, context?: Record<string, unknown> }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { CONSENT_VERSIONS, type ConsentType } from "@/src/lib/consent"
import { hashForConsent } from "@/src/lib/consentServer"

export const runtime = "nodejs"

const consentRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 20 })

const VALID_TYPES: ConsentType[] = [
  "lab_processing",
  "ai_processing",
  "retention_default",
  "health_data_privacy_v1",
]

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!consentRateLimiter.allow(ip)) {
    return NextResponse.json(
      { error: "Too many consent writes. Wait a minute.", code: "rate_limited" },
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

  let body: { consentType?: string; context?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const consentType = body.consentType
  if (typeof consentType !== "string" || !VALID_TYPES.includes(consentType as ConsentType)) {
    return NextResponse.json({ error: "Invalid consent type" }, { status: 400 })
  }
  const typed = consentType as ConsentType

  const ua = req.headers.get("user-agent") ?? ""
  const ipHash = ip && ip !== "unknown" ? hashForConsent(ip) : ""
  const uaHash = ua ? hashForConsent(ua) : ""

  const { error: insertErr } = await supabase.from("user_consents").insert({
    user_id: user.id,
    consent_type: typed,
    version: CONSENT_VERSIONS[typed],
    accepted: true,
    ip_hash: ipHash,
    user_agent_hash: uaHash,
    context: body.context ?? {},
  })

  if (insertErr) {
    return NextResponse.json(
      { error: "Could not record consent", detail: insertErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
