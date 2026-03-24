import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { chatRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { createClient } from "@/src/lib/supabase/server"

const SYSTEM_PROMPT = `You are Clarion's health education assistant. You help users understand their biomarkers and general wellness in plain language. You must:
- Give clear, evidence-based education only. You never diagnose or prescribe.
- Always suggest users discuss specific results and treatments with their clinician.
- If the user shares biomarker values or results, use them only to explain what they might mean in general terms and what follow-up (e.g. retesting, talking to a doctor) could look like.
- Keep answers concise and actionable. Use simple language.`

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!chatRateLimiter.allow(ip)) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a minute and try again." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null

    let context = ""
    if (userId) {
      const [profileRes, bloodworkRes] = await Promise.all([
        supabase.from("profiles").select("profile_type, age, sex").eq("user_id", userId).maybeSingle(),
        supabase.from("bloodwork_saves").select("score, key_flagged_biomarkers").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ])
      const profile = profileRes.data
      const bloodwork = bloodworkRes.data
      if (profile?.profile_type) context += `User profile focus: ${profile.profile_type}. `
      if (bloodwork?.score != null) context += `Latest health score: ${bloodwork.score}. `
      if (Array.isArray(bloodwork?.key_flagged_biomarkers) && bloodwork.key_flagged_biomarkers.length > 0) {
        context += `Flagged biomarkers: ${(bloodwork.key_flagged_biomarkers as string[]).slice(0, 10).join(", ")}. `
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Assistant is not configured. Please add OPENAI_API_KEY to enable." },
        { status: 503 }
      )
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + (context ? `\n\nRelevant context (use only for education): ${context}` : "") },
        { role: "user", content: message },
      ],
      max_tokens: 500,
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("OpenAI API error:", res.status, err)
      let userMessage = "The assistant is temporarily unavailable."
      try {
        const errJson = JSON.parse(err) as { error?: { message?: string } }
        const msg = errJson?.error?.message
        if (msg && process.env.NODE_ENV === "development") {
          userMessage = msg
        }
      } catch {
        // keep generic message
      }
      return NextResponse.json(
        { error: userMessage },
        { status: 502 }
      )
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "I couldn’t generate a response. Please try again or rephrase your question."
    return NextResponse.json({ reply })
  } catch (e) {
    console.error("Chat API error:", e)
    Sentry.captureException(e)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
