import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { chatRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { createClient } from "@/src/lib/supabase/server"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"

export const runtime = "nodejs"

const SYSTEM_BASE = `You are Clarion's health education assistant. You help users understand biomarker panels in plain language.
- Education only—never diagnose, prescribe, or replace a clinician.
- Do NOT invent citations, PMIDs, or URLs.
- Return ONLY valid JSON matching the requested shape—no markdown outside JSON, no preamble.`

const USER_INSTRUCTION = `Given the biomarker snapshot below, return ONLY a JSON object with exactly these keys:
- "headline": string — one short, encouraging sentence summarizing overall status (honest if mixed).
- "strengths": string[] — 2–5 short bullets for markers or patterns that look favorable or in range.
- "attention": string[] — 1–5 bullets, each at most ~8 words, terse label-style (e.g. "BUN slightly elevated", "WBC slightly low") for markers or patterns that may warrant follow-up or discussion with a clinician (supportive tone, not alarmist). No long sentences.
- "reassurance": string — 2–3 short sentences. Informative and respectful—never condescending, never moralizing, never implying the reader is overreacting or "doesn't understand." Matter-of-fact: labs are often context-dependent; the full review adds plain-language explanation and useful angles for a clinician conversation (education only, not diagnosis). If nothing is out of range, one calm sentence about what the full review offers is enough.
- "fullOverview": string — a longer educational write-up (3–5 short paragraphs) expanding on the panel: context, what looks good, what to watch, retest/lifestyle framing, and a reminder this is educational not medical advice.

If a key has nothing to say, use an empty array for arrays or a brief neutral string for headline/fullOverview/reassurance.`

export type BiomarkerOverviewApiPayload = {
  headline: string
  strengths: string[]
  attention: string[]
  reassurance: string
  fullOverview: string
}

function extractJsonText(raw: string): string {
  const t = raw.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  return t
}

function parseOverviewPayload(text: string): BiomarkerOverviewApiPayload | null {
  try {
    const j = JSON.parse(extractJsonText(text)) as unknown
    if (!j || typeof j !== "object") return null
    const o = j as Record<string, unknown>
    const headline = typeof o.headline === "string" ? o.headline.trim() : ""
    const strengths = Array.isArray(o.strengths)
      ? o.strengths.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim())
      : []
    const attention = Array.isArray(o.attention)
      ? o.attention.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim())
      : []
    const fullOverview = typeof o.fullOverview === "string" ? o.fullOverview.trim() : ""
    const reassurance = typeof o.reassurance === "string" ? o.reassurance.trim() : ""
    if (!headline && strengths.length === 0 && attention.length === 0 && !fullOverview && !reassurance) return null
    return { headline, strengths, attention, reassurance, fullOverview }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!chatRateLimiter.allow(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const biomarkerSnapshot = typeof body?.biomarkerSnapshot === "string" ? body.biomarkerSnapshot.trim() : ""
    if (!biomarkerSnapshot) {
      return NextResponse.json({ error: "biomarkerSnapshot is required" }, { status: 400 })
    }
    const snapshot =
      biomarkerSnapshot.length > 12_000 ? `${biomarkerSnapshot.slice(0, 12_000)}\n…` : biomarkerSnapshot

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null

    let context = ""
    if (userId) {
      const [profileRes, bloodworkRes] = await Promise.all([
        supabase.from("profiles").select("profile_type, age, sex").eq("user_id", userId).maybeSingle(),
        supabase
          .from("bloodwork_saves")
          .select("score, key_flagged_biomarkers")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      const profile = profileRes.data
      const bloodwork = bloodworkRes.data
      if (profile?.profile_type) context += `User profile focus: ${profile.profile_type}. `
      if (bloodwork?.score != null) context += `Latest health score: ${bloodwork.score}. `
      if (Array.isArray(bloodwork?.key_flagged_biomarkers) && bloodwork.key_flagged_biomarkers.length > 0) {
        context += `Flagged biomarkers: ${(bloodwork.key_flagged_biomarkers as string[]).slice(0, 10).join(", ")}. `
      }
    }

    const apiKey = getOpenAiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Assistant is not configured. Please add OPENAI_API_KEY to enable." },
        { status: 503 }
      )
    }

    const systemContent =
      SYSTEM_BASE +
      (context ? `\n\nContext (education only): ${context}` : "") +
      `\n\nBiomarker snapshot:\n${snapshot}`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: USER_INSTRUCTION },
        ],
        max_tokens: 1600,
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("OpenAI biomarkers-overview error:", res.status, err)
      return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 })
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const raw = data?.choices?.[0]?.message?.content?.trim() ?? ""
    const parsed = parseOverviewPayload(raw)
    if (!parsed) {
      Sentry.captureMessage("biomarkers-overview: invalid JSON from model", { extra: { rawLen: raw.length } })
      return NextResponse.json({ error: "Could not parse overview. Please try again." }, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (e) {
    console.error("biomarkers-overview API error:", e)
    Sentry.captureException(e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
