import { NextRequest, NextResponse } from "next/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"

export const runtime = "nodejs"

const resolveProductUrlRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 16 })

/**
 * Infer a human-readable supplement product title from an e-commerce URL (often Amazon slug + path).
 * Does not fetch remote pages — uses URL text + optional hint only.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!resolveProductUrlRateLimiter.allow(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 })
  }

  const key = getOpenAiApiKey()
  if (!key) {
    return NextResponse.json({ error: "Product resolution is not configured (OPENAI_API_KEY)." }, { status: 503 })
  }

  let body: { url?: string; hintName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const url = typeof body.url === "string" ? body.url.trim().slice(0, 1200) : ""
  const hintName = typeof body.hintName === "string" ? body.hintName.trim().slice(0, 200) : ""
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "A valid http(s) product URL is required." }, { status: 400 })
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You infer supplement product titles from shopping URLs. The app will show your title in a stack list — not medical advice. " +
            "Use the URL path, slug, and query hints (e.g. Amazon /dp/ASIN/product-title-words). " +
            "Produce a concise display name: category or nutrient — form/brand detail when clear (e.g. \"Iron — ferrous sulfate liquid\", \"Vitamin D3 — 5000 IU softgels\"). " +
            "No markdown. Return ONLY valid JSON with keys displayName (string) and marker (string or null). " +
            "marker must be one of: Ferritin, Vitamin D, Magnesium, Vitamin B12, Folate, Triglycerides, hs-CRP, Glucose, LDL-C, Testosterone, Zinc, null. " +
            "Use Ferritin for iron/ferrous/ferritin products; Vitamin D for D3/cholecalciferol; null if unclear.",
        },
        {
          role: "user",
          content: `Product URL:\n${url}\n\nUser hint (optional):\n${hintName || "(none)"}`,
        },
      ],
      max_tokens: 220,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    return NextResponse.json({ error: "Resolution failed", detail: t.slice(0, 200) }, { status: 502 })
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ""
  let displayName = ""
  let marker: string | null = null
  try {
    const parsed = JSON.parse(text) as { displayName?: unknown; marker?: unknown }
    if (typeof parsed.displayName === "string" && parsed.displayName.trim()) {
      displayName = parsed.displayName.trim().slice(0, 180)
    }
    if (parsed.marker === null) marker = null
    else if (typeof parsed.marker === "string" && parsed.marker.trim()) marker = parsed.marker.trim()
  } catch {
    return NextResponse.json({ error: "Could not parse product name", raw: text.slice(0, 400) }, { status: 502 })
  }

  if (!displayName) {
    return NextResponse.json({ error: "Empty display name from model", raw: text.slice(0, 400) }, { status: 502 })
  }

  return NextResponse.json({ displayName, marker })
}
