import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { getClientIp, supportChatRateLimiter } from "@/src/lib/apiRateLimit"
import { matchSupportFaq, staticSupportFallback } from "@/src/lib/supportFaq"

const SYSTEM_PROMPT_SUPPORT = `You are Clarion Labs' customer support helper. You answer only about:
- Account, login, and navigation in the Clarion web app
- Billing and subscriptions at a high level (no specific legal promises)
- Where to find features (dashboard, plan, trends, settings)
- Pointing users to /faq for common questions

You must NOT:
- Give medical advice, interpret biomarkers, diagnose, or recommend doses
- Share anything that sounds like clinical guidance (defer to their clinician and the in-app "Ask Clarion" health assistant for general education only)

If the user asks health/medical questions, briefly say that the Help chat is for account and product support, and they can use "Ask Clarion" on the right for general wellness education—not for emergencies.

Keep answers short (under 120 words). If unsure, tell them to email support or read clarionlabs.com/faq.`

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!supportChatRateLimiter.allow(ip)) {
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

    const faqHit = matchSupportFaq(message)
    if (faqHit) {
      return NextResponse.json({
        reply: faqHit.reply,
        source: faqHit.source,
        faqId: faqHit.faqId,
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        reply: staticSupportFallback(),
        source: "fallback" as const,
      })
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_SUPPORT },
        { role: "user", content: message },
      ],
      max_tokens: 400,
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
      console.error("Support chat OpenAI error:", res.status, await res.text())
      return NextResponse.json({
        reply: staticSupportFallback(),
        source: "fallback" as const,
      })
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ??
      staticSupportFallback()
    return NextResponse.json({ reply, source: "llm" as const })
  } catch (e) {
    console.error("Support chat error:", e)
    Sentry.captureException(e)
    return NextResponse.json(
      { error: "Something went wrong. Please try again or see clarionlabs.com/faq." },
      { status: 500 }
    )
  }
}
