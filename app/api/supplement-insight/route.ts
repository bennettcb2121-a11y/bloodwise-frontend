import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { supplementInsightRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { createClient } from "@/src/lib/supabase/server"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"

export const runtime = "nodejs"

const SYSTEM_PROMPT = `You are Clarion's supplement education assistant. The user scanned or typed a product barcode. Your job is personalized, practical education — not diagnosis or prescribing.

Hard rules:
- This is NOT medical advice. Never say "take this", "you need", "you should take X mg", or imply certainty about safety or efficacy for this person.
- Discuss dose only in general educational terms (e.g. how labels often express units, or what people commonly discuss with clinicians). Always say the product label and their clinician trump any app.
- You do NOT have verified supplement facts for this barcode. Product names from databases can be wrong. Say so briefly if relevant.
- Pricing: You NEVER invent prices. If the user did NOT provide price and servings, say Clarion has no verified price data and only discuss value in general terms (e.g. compare categories, shop around).
- If the user DID provide total price and servings, Clarion computed an approximate cost per serving — you may use ONLY those numbers to discuss value in broad, educational terms (e.g. whether that $/serving seems high or low vs typical ranges for this category, in general language). Remind them the numbers are self-reported and regional prices vary.
- Use the user's lab summary and profile when provided to explain relevance (e.g. "given your ferritin context…"). If labs are missing, say personalization is limited until they add results.
- Be concise: 2–4 short paragraphs, max ~360 words. Warm, plain language. End with one line reminding them to confirm with a clinician for new supplements.`

function buildUserContext(profile: ProfileRow | null, biomarkerSummary: string): string {
  const parts: string[] = []
  if (profile?.age) parts.push(`Age band (self-reported): ${profile.age}`)
  if (profile?.sex) parts.push(`Sex (self-reported): ${profile.sex}`)
  if (profile?.diet_preference) parts.push(`Diet preference: ${profile.diet_preference}`)
  if (profile?.supplement_form_preference) parts.push(`Form preference: ${profile.supplement_form_preference}`)
  if (profile?.shopping_preference) parts.push(`Shopping preference: ${profile.shopping_preference}`)
  if (profile?.current_supplement_spend) parts.push(`Approx monthly supplement spend (self-reported): ${profile.current_supplement_spend}`)
  if (profile?.current_supplements) {
    const raw = profile.current_supplements.trim()
    if (raw) parts.push(`Current supplements (self-reported, may be truncated): ${raw.slice(0, 800)}`)
  }
  if (profile?.goal) parts.push(`Stated goal: ${profile.goal.slice(0, 200)}`)
  parts.push(`Biomarker analysis (from latest saved labs in Clarion):\n${biomarkerSummary}`)
  return parts.join("\n")
}

function extractAmazonAsin(url: string): string | null {
  const t = url.trim()
  if (!t) return null
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`)
    if (!/amazon\.(com|co\.uk|de|fr|ca|in|es|it|com\.au|co\.jp|com\.mx|nl|se|pl)/i.test(u.hostname)) return null
    const m = u.pathname.match(/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/|\?|$)/i)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

function biomarkerSummaryFromInputs(inputs: Record<string, string | number> | null | undefined, profile: ProfileRow | null): string {
  if (!inputs || typeof inputs !== "object" || Object.keys(inputs).length === 0) {
    return "No lab values on file. Encourage adding bloodwork for marker-level personalization."
  }
  const prof = profile
    ? {
        age: profile.age,
        sex: profile.sex,
        sport: profile.sport,
        training_focus: profile.training_focus?.trim() || undefined,
      }
    : {}
  const results = analyzeBiomarkers(inputs, prof)
  const lines = results.slice(0, 14).map((r) => {
    const range =
      r.optimalMin != null && r.optimalMax != null
        ? `optimal ~${r.optimalMin}–${r.optimalMax}`
        : "range n/a"
    return `- ${r.name}: ${r.value} (${r.status}; ${range})`
  })
  return lines.join("\n")
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!supplementInsightRateLimiter.allow(ip)) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 })
    }

    const body = await req.json()
    const barcode = typeof body?.barcode === "string" ? body.barcode.trim() : ""
    const productName = typeof body?.productName === "string" ? body.productName.trim() : ""
    if (!barcode || !productName) {
      return NextResponse.json({ error: "barcode and productName are required" }, { status: 400 })
    }

    const rawUrl = typeof body?.productUrl === "string" ? body.productUrl.trim().slice(0, 500) : ""
    const asin = rawUrl ? extractAmazonAsin(rawUrl) : null

    let priceUsd: number | undefined
    if (body?.priceUsd != null && body.priceUsd !== "") {
      const n = Number(body.priceUsd)
      if (Number.isFinite(n) && n > 0 && n <= 50_000) priceUsd = Math.round(n * 100) / 100
    }
    let servingsPerBottle: number | undefined
    if (body?.servingsPerBottle != null && body.servingsPerBottle !== "") {
      const n = Number(body.servingsPerBottle)
      if (Number.isFinite(n) && n >= 1 && n <= 10_000) servingsPerBottle = Math.round(n)
    }

    let valueBlock = ""
    if (priceUsd != null && servingsPerBottle != null) {
      const perServing = priceUsd / servingsPerBottle
      valueBlock = `Self-reported purchase math (not verified): paid $${priceUsd.toFixed(2)} for ${servingsPerBottle} servings → ~$${perServing.toFixed(3)} per serving. Use only these figures for value discussion; do not invent other prices.`
    } else if (priceUsd != null) {
      valueBlock = `Self-reported: user paid about $${priceUsd.toFixed(2)} total (servings not provided — do not compute $/serving).`
    }

    const urlBlock =
      rawUrl
        ? `Product link (user-provided): ${rawUrl}${asin ? `\nDetected Amazon ASIN (for context only): ${asin}` : ""}`
        : ""

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()
    const profile = profileRow as ProfileRow | null

    const { data: bloodwork } = await supabase
      .from("bloodwork_saves")
      .select("biomarker_inputs")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const inputs = bloodwork?.biomarker_inputs as Record<string, string | number> | undefined
    const biomarkerSummary = biomarkerSummaryFromInputs(inputs, profile)

    const userBlock = buildUserContext(profile, biomarkerSummary)

    const apiKey = getOpenAiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI insight is not configured. Add OPENAI_API_KEY.", code: "NO_AI" },
        { status: 503 }
      )
    }

    const userMessage = `Product name (from barcode database — may be inaccurate): ${productName}
Barcode: ${barcode}
${valueBlock ? `\n${valueBlock}\n` : ""}${urlBlock ? `\n${urlBlock}\n` : ""}
User context:
${userBlock}

Write the personalized education response. If valueBlock is empty, do not imply we know this product's price.`

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 650,
      temperature: 0.45,
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
      console.error("OpenAI supplement-insight error:", res.status, err)
      return NextResponse.json({ error: "AI insight temporarily unavailable." }, { status: 502 })
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const insight = data?.choices?.[0]?.message?.content?.trim()
    if (!insight) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    return NextResponse.json({ insight })
  } catch (e) {
    console.error("supplement-insight API error:", e)
    Sentry.captureException(e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
