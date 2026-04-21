/**
 * Personalized lab interpretation.
 *
 * Flow:
 *   1. Auth + consent check (lab_processing + ai_processing must be active).
 *   2. Load user profile and resolve either (a) a specific session_id's biomarker values,
 *      or (b) the latest per-marker values across all sessions.
 *   3. Run deterministic rule-based interpretation (biomarkerPersonalInterpret).
 *   4. Run phenotype-filtered supplement recommendation (supplementRecommendations).
 *   5. Hand the structured deterministic output to gpt-4o with an explicit "narrate, don't invent"
 *      prompt. The AI only rephrases; every suggestion already has deterministic provenance.
 *
 * The AI response is always optional — UI falls back to the deterministic output on failure.
 */

import { NextRequest, NextResponse } from "next/server"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { ConsentError, requireConsents } from "@/src/lib/consentServer"
import {
  interpretPanelPersonal,
  phenotypeFromProfile,
} from "@/src/lib/biomarkerPersonalInterpret"
import { recommendSupplementsFromInterpretations } from "@/src/lib/supplementRecommendations"
import { phenotypeSummary } from "@/src/lib/phenotypeContext"

export const runtime = "nodejs"
export const maxDuration = 30

const interpretRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60_000,
  max: 20,
})

type InterpretBody = {
  /** If provided, only values from this session are interpreted. */
  sessionId?: string
  /** Free-form user question (optional). Sanitized before passing to AI. */
  question?: string
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!interpretRateLimiter.allow(ip)) {
    return NextResponse.json(
      { error: "Too many interpretation requests. Wait a minute.", code: "rate_limited" },
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
    await requireConsents(user.id, ["lab_processing", "ai_processing"])
  } catch (e) {
    if (e instanceof ConsentError) {
      return NextResponse.json(
        { error: "Missing required consents.", code: "consent_required", missing: e.missing },
        { status: 403 }
      )
    }
    throw e
  }

  let body: InterpretBody = {}
  try {
    body = (await req.json()) as InterpretBody
  } catch {
    // empty body is fine
  }

  // Profile for phenotype & adaptive ranges
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  // Pull values: if sessionId is provided, only that session; else last 6 months of confirmed values.
  const sinceIso = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()
  let query = supabase
    .from("lab_biomarker_values")
    .select("biomarker_key, value, unit, confidence, collected_at, session_id, created_at")
    .eq("user_id", user.id)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
  if (body.sessionId) {
    query = supabase
      .from("lab_biomarker_values")
      .select("biomarker_key, value, unit, confidence, collected_at, session_id, created_at")
      .eq("user_id", user.id)
      .eq("session_id", body.sessionId)
  }

  const { data: rows, error: rowsErr } = await query
  if (rowsErr) {
    return NextResponse.json(
      { error: "Could not load lab values", detail: rowsErr.message },
      { status: 500 }
    )
  }

  // Keep the most recent value per biomarker.
  const latest: Record<string, { value: number; unit: string }> = {}
  for (const r of rows ?? []) {
    const key = String((r as { biomarker_key: string }).biomarker_key)
    if (key in latest) continue
    const v = Number((r as { value: number }).value)
    if (!Number.isFinite(v)) continue
    latest[key] = { value: v, unit: String((r as { unit?: string }).unit ?? "") }
  }

  const { interpretations, patterns } = interpretPanelPersonal(latest, profile ?? null)
  const { phenotype } = phenotypeFromProfile(profile ?? null)
  const supplements = recommendSupplementsFromInterpretations(interpretations, phenotype)

  // Assemble narrative via gpt-4o
  const key = getOpenAiApiKey()
  let narrative: string | null = null
  if (key) {
    try {
      narrative = await generateNarrative(key, {
        phenotypeSummary: phenotypeSummary(phenotype),
        interpretations,
        patterns,
        supplements,
        question: (body.question ?? "").slice(0, 400),
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("interpret narrative failed:", e instanceof Error ? e.message : String(e))
    }
  }

  return NextResponse.json({
    phenotype: phenotypeSummary(phenotype),
    interpretations,
    patterns,
    supplements,
    narrative,
  })
}

async function generateNarrative(
  apiKey: string,
  input: {
    phenotypeSummary: string
    interpretations: Array<{
      biomarkerKey: string
      value: number
      unit: string
      status: string
      base: string
      personal: string[]
      redFlag: string | null
    }>
    patterns: Array<{ title: string; explanation: string; markers: string[]; severity: string }>
    supplements: Array<{ name: string; reason: string; biomarkerKey: string; dose: string; evidence: string }>
    question: string
  }
): Promise<string> {
  const redacted = JSON.stringify(input).slice(0, 12000) // hard cap

  const prompt = `You are Clarion, a calm, clinically careful wellness analyst. Narrate the user's lab results for them in 4–7 short paragraphs.

RULES:
1. Do not invent biomarker values, supplements, or interpretations that are not in the structured input below.
2. Do not give dosing outside the strings already in "supplements".
3. Do not diagnose. When a red-flag note is present, state it plainly and suggest the user contact their clinician.
4. Use plain language, no emoji, no headers, no bullet lists unless listing patterns. Keep it warm and specific.
5. Prioritize the 2–3 things that matter most for this user given their phenotype. Skip optimal markers unless they reinforce a pattern.
6. End with a one-line reminder that this is educational and not medical advice.

STRUCTURED INPUT (JSON):
${redacted}

Write the narrative now.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 900,
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`openai_${res.status}:${t.slice(0, 240)}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) throw new Error("empty_narrative")
  return text
}
