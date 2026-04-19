import { NextResponse } from "next/server"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"

export const runtime = "nodejs"

/**
 * Vision model reads supplement bottle labels / pile of bottles from a photo.
 * Requires OPENAI_API_KEY. Returns { supplements: string[] }.
 */
export async function POST(request: Request) {
  const key = getOpenAiApiKey()
  if (!key) {
    return NextResponse.json(
      { error: "AI vision is not configured (OPENAI_API_KEY)." },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = form.get("image")
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 })
  }

  const mime = file.type || "image/jpeg"
  const buf = Buffer.from(await file.arrayBuffer())
  const base64 = buf.toString("base64")
  const dataUrl = `data:${mime};base64,${base64}`

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
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are helping parse dietary supplement bottles. List each distinct supplement name visible (e.g. Vitamin D3, Magnesium glycinate, Iron bisglycinate). Return ONLY valid JSON: {\"supplements\":[\"Name1\",\"Name2\"]}. No markdown. If unreadable or no supplements, {\"supplements\":[]}.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 600,
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    return NextResponse.json(
      { error: "Vision request failed", detail: t.slice(0, 200) },
      { status: 502 }
    )
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ""
  let supplements: string[] = []
  try {
    const parsed = JSON.parse(text) as { supplements?: unknown }
    if (Array.isArray(parsed.supplements)) {
      supplements = parsed.supplements.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    }
  } catch {
    return NextResponse.json(
      { error: "Could not parse AI response", raw: text.slice(0, 500) },
      { status: 502 }
    )
  }

  return NextResponse.json({ supplements })
}
