/**
 * Confirm extracted lab values: insert canonical biomarker rows, delete raw uploads, mark session.
 *
 * POST body: {
 *   sessionId: string,
 *   values: Array<{
 *     biomarker_key: string,
 *     value: number,
 *     unit: string,
 *     raw_name: string,
 *     raw_value?: string,
 *     raw_unit?: string,
 *     range_low?: number | null,
 *     range_high?: number | null,
 *     flag?: string,
 *     confidence?: number,
 *   }>,
 *   collected_at?: string,
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { ConsentError, requireConsents } from "@/src/lib/consentServer"

export const runtime = "nodejs"

const labConfirmRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 30 })

type ConfirmValue = {
  biomarker_key: string
  value: number
  unit?: string
  raw_name?: string
  raw_value?: string
  raw_unit?: string
  range_low?: number | null
  range_high?: number | null
  flag?: string
  confidence?: number
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!labConfirmRateLimiter.allow(ip)) {
    return NextResponse.json(
      { error: "Too many confirmations. Wait a minute.", code: "rate_limited" },
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

  try {
    await requireConsents(user.id, ["lab_processing"])
  } catch (e) {
    if (e instanceof ConsentError) {
      return NextResponse.json(
        { error: "Missing required consents.", code: "consent_required", missing: e.missing },
        { status: 403 }
      )
    }
    throw e
  }

  let body: { sessionId?: string; values?: ConfirmValue[]; collected_at?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId = String(body.sessionId ?? "").trim()
  const values = Array.isArray(body.values) ? body.values : []
  const collectedAt = typeof body.collected_at === "string" ? body.collected_at : null

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }
  if (values.length === 0) {
    return NextResponse.json({ error: "No values to save" }, { status: 400 })
  }

  // Verify session belongs to user
  const { data: session, error: sessionErr } = await supabase
    .from("lab_upload_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const rows = values
    .filter((v) => v && typeof v.biomarker_key === "string" && Number.isFinite(v.value))
    .map((v) => ({
      user_id: user.id,
      session_id: sessionId,
      biomarker_key: v.biomarker_key,
      value: v.value,
      unit: v.unit ?? "",
      raw_name: v.raw_name ?? "",
      raw_value: v.raw_value ?? "",
      raw_unit: v.raw_unit ?? "",
      range_low: v.range_low ?? null,
      range_high: v.range_high ?? null,
      flag: v.flag ?? "",
      confidence: typeof v.confidence === "number" ? v.confidence : 1,
      source: "ai_extracted",
      collected_at: collectedAt,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: "All values invalid" }, { status: 400 })
  }

  const { error: insertErr } = await supabase.from("lab_biomarker_values").insert(rows)
  if (insertErr) {
    return NextResponse.json(
      { error: "Could not save values", detail: insertErr.message },
      { status: 500 }
    )
  }

  // Mirror the confirmed values into `bloodwork_saves` so the existing trends, analysis,
  // and home-score pipelines pick them up without changes. `bloodwork_saves` is
  // append-only (insert, not upsert), which preserves every prior save — that is how
  // progression over time works. Each confirmed upload becomes its own history entry.
  const biomarkerInputs: Record<string, string | number> = {}
  const selectedPanel: string[] = []
  for (const r of rows) {
    if (!biomarkerInputs[r.biomarker_key]) {
      biomarkerInputs[r.biomarker_key] = r.value
      selectedPanel.push(r.biomarker_key)
    }
  }
  const nowIso = new Date().toISOString()
  const { error: saveErr } = await supabase.from("bloodwork_saves").insert({
    user_id: user.id,
    selected_panel: selectedPanel,
    biomarker_inputs: biomarkerInputs,
    current_step: 13,
    score: null,
    detected_patterns: [],
    key_flagged_biomarkers: [],
    stack_snapshot: { source: "lab_upload", session_id: sessionId },
    savings_snapshot: {},
    created_at: nowIso,
    updated_at: nowIso,
  })
  // Non-fatal: if the mirror fails we still return ok so the lab_biomarker_values
  // write (source of truth for labs) is not blocked. We log and continue.
  if (saveErr) {
    console.warn("[labs/confirm] bloodwork_saves mirror failed:", saveErr.message)
  }

  // Delete raw uploaded files from storage (retention policy = immediate-after-confirm).
  // If this fails we must NOT report `raw_deleted_at`, otherwise we'd be claiming in our
  // audit trail that the raw PDFs/images are gone when they still live in the bucket.
  // We mark the session as `cleanup_failed` so a scheduled janitor job can retry and we
  // surface the failure to the caller (the UI shows a non-blocking warning but the
  // biomarker values are saved either way, which is the user's primary ask).
  const { data: extractions } = await supabase
    .from("lab_extractions")
    .select("id, storage_path")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)

  const paths = (extractions ?? [])
    .map((r) => r.storage_path as string | null)
    .filter((p): p is string => typeof p === "string" && p.length > 0)

  let cleanupOk = true
  let cleanupError: string | null = null

  if (paths.length > 0) {
    const { error: removeErr } = await supabase.storage.from("lab-uploads").remove(paths)
    if (removeErr) {
      cleanupOk = false
      cleanupError = removeErr.message
      // Log loudly — retention promises to the user depend on this actually happening.
      console.error("[labs/confirm] storage cleanup failed", {
        sessionId,
        userId: user.id,
        pathCount: paths.length,
        error: removeErr.message,
      })
    } else {
      const { error: clearErr } = await supabase
        .from("lab_extractions")
        .update({ storage_path: null })
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
      if (clearErr) {
        console.warn("[labs/confirm] lab_extractions storage_path clear failed:", clearErr.message)
      }
    }
  }

  const nowStamp = new Date().toISOString()
  await supabase
    .from("lab_upload_sessions")
    .update({
      status: cleanupOk ? "confirmed" : "cleanup_failed",
      raw_deleted_at: cleanupOk ? nowStamp : null,
      collected_at: collectedAt,
      updated_at: nowStamp,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  return NextResponse.json({
    ok: true,
    saved: rows.length,
    cleanup: cleanupOk ? "deleted" : "pending",
    cleanup_error: cleanupError,
  })
}
