import { NextResponse } from "next/server"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"

export const runtime = "nodejs"

const LABEL_SCHEMA = {
  name: "supplement_label_products",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["products"],
    properties: {
      products: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "brand", "dose", "form", "servingsPerContainer", "confidence"],
          properties: {
            name: { type: "string", description: "Primary supplement name on the label" },
            brand: { type: "string", description: "Brand if visible, else empty string" },
            dose: { type: "string", description: "Serving dose as printed, else empty string" },
            form: { type: "string", description: "e.g. softgel, capsule, liquid, powder, or empty string" },
            servingsPerContainer: {
              type: ["integer", "null"],
              description: "Numeric servings if clearly stated, else null",
            },
            confidence: {
              type: "number",
              description: "0–1 confidence that name/dose are correct",
            },
          },
        },
      },
    },
  },
} as const

const VISION_PROMPT = `You read dietary supplement bottle labels from photos. For each distinct product visible, extract:
- name: the main supplement name (e.g. Vitamin D3, Magnesium glycinate)
- brand: manufacturer if visible, else ""
- dose: per-serving amount as printed (e.g. "2000 IU", "400 mg"), else ""
- form: softgel, capsule, tablet, liquid, powder, gummy, or "" if unclear
- servingsPerContainer: integer if the label states servings/count per bottle, else null
- confidence: 0.0–1.0 for how sure you are about name and dose

Skip non-supplement items. If unreadable or no supplements, return an empty products array.`

export type VisionLabelProduct = {
  name: string
  brand: string
  dose: string
  form: string
  servingsPerContainer: number | null
  confidence: number
}

async function callVision(
  key: string,
  model: string,
  dataUrl: string
): Promise<{ products: VisionLabelProduct[] }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: LABEL_SCHEMA,
      },
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`openai_${res.status}:${t.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string; refusal?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) throw new Error("empty_content")
  const parsed = JSON.parse(text) as { products?: unknown }
  if (!Array.isArray(parsed.products)) throw new Error("invalid_shape")
  const products = parsed.products.filter((p): p is VisionLabelProduct => {
    if (!p || typeof p !== "object") return false
    const o = p as Record<string, unknown>
    return typeof o.name === "string" && typeof o.confidence === "number"
  })
  return { products }
}

/**
 * Vision parse of supplement labels. Structured JSON output (gpt-4o, mini fallback).
 * Requires OPENAI_API_KEY. Returns { products } plus legacy { supplements: names }.
 */
export async function POST(request: Request) {
  const key = getOpenAiApiKey()
  if (!key) {
    return NextResponse.json(
      { error: "AI vision is not configured (OPENAI_API_KEY).", code: "no_openai" },
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

  let products: VisionLabelProduct[] = []
  try {
    const primary = await callVision(key, "gpt-4o", dataUrl)
    products = primary.products
  } catch {
    try {
      const fallback = await callVision(key, "gpt-4o-mini", dataUrl)
      products = fallback.products
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json(
        { error: "Vision request failed", detail: msg.slice(0, 240) },
        { status: 502 }
      )
    }
  }

  const cleaned = products
    .map((p) => ({
      name: String(p.name || "").trim(),
      brand: String(p.brand || "").trim(),
      dose: String(p.dose || "").trim(),
      form: String(p.form || "").trim(),
      servingsPerContainer:
        typeof p.servingsPerContainer === "number" && Number.isFinite(p.servingsPerContainer)
          ? Math.round(p.servingsPerContainer)
          : null,
      confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0)),
    }))
    .filter((p) => p.name.length > 0)

  const supplements = cleaned.map((p) => p.name)

  return NextResponse.json({ products: cleaned, supplements })
}
