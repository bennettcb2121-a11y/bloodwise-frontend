import { NextRequest, NextResponse } from "next/server"
import { getOpenAiApiKey } from "@/src/lib/openaiEnv"
import { createClient } from "@/src/lib/supabase/server"
import { createSlidingWindowRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
import { ConsentError, hashForConsent, requireConsents } from "@/src/lib/consentServer"
import {
  LAB_EXTRACTION_PROMPT,
  LAB_EXTRACTION_SCHEMA,
} from "@/src/lib/labExtractionPrompt"

export const runtime = "nodejs"
export const maxDuration = 60

/** Very tight rate limit — lab extraction is expensive and abuse-sensitive. */
const labExtractRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60_000,
  max: 6,
})

/** 12 MB per file; 40 MB total per request. */
const MAX_FILE_BYTES = 12 * 1024 * 1024
const MAX_TOTAL_BYTES = 40 * 1024 * 1024
const MAX_FILES = 10

const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

type ExtractionRow = {
  testName: string
  value: number | null
  unit: string
  rangeLow: number | null
  rangeHigh: number | null
  flag: string
  confidence: number
}

type Extraction = {
  rows: ExtractionRow[]
  collected_at: string
  lab_provider: string
  overall_confidence: number
}

async function callVision(
  key: string,
  model: string,
  dataUrl: string,
  mime: string
): Promise<Extraction> {
  // gpt-4o can handle PDFs directly via `file` part, but the Chat Completions endpoint
  // only accepts images inline. For PDFs we still use image_url with a data: URL because
  // OpenAI's multimodal endpoint supports it via the file modality; for safety we flag
  // PDFs and let the client rasterize them client-side when needed. Here we pass the raw
  // base64 — gpt-4o will accept image/* directly and will error on application/pdf.
  const isImage = mime.startsWith("image/")

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: LAB_EXTRACTION_PROMPT },
  ]
  if (isImage) {
    content.push({ type: "image_url", image_url: { url: dataUrl } })
  } else {
    // For PDF we attach as a file-style URL. The chat completions API accepts
    // image URLs; PDFs must be converted to images upstream (the client does this).
    // If this branch is reached with a PDF, we surface a clear error.
    throw new Error("pdf_requires_client_rasterization")
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      max_tokens: 4000,
      response_format: {
        type: "json_schema",
        json_schema: LAB_EXTRACTION_SCHEMA,
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
  const parsed = JSON.parse(text) as Extraction
  if (!Array.isArray(parsed.rows)) throw new Error("invalid_shape")
  return {
    rows: parsed.rows.filter(
      (r): r is ExtractionRow =>
        !!r && typeof r === "object" && typeof (r as ExtractionRow).testName === "string"
    ),
    collected_at: String(parsed.collected_at || ""),
    lab_provider: String(parsed.lab_provider || ""),
    overall_confidence: Math.min(
      1,
      Math.max(0, Number(parsed.overall_confidence) || 0)
    ),
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!labExtractRateLimiter.allow(ip)) {
    return NextResponse.json(
      { error: "Too many uploads right now. Try again in a minute.", code: "rate_limited" },
      { status: 429 }
    )
  }

  const key = getOpenAiApiKey()
  if (!key) {
    return NextResponse.json(
      { error: "AI extraction is not configured (OPENAI_API_KEY missing).", code: "no_openai" },
      { status: 503 }
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
    await requireConsents(user.id, ["lab_processing", "ai_processing", "retention_default"])
  } catch (e) {
    if (e instanceof ConsentError) {
      return NextResponse.json(
        {
          error: "Missing required consents.",
          code: "consent_required",
          missing: e.missing,
        },
        { status: 403 }
      )
    }
    throw e
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data", code: "bad_form" }, { status: 400 })
  }

  const files = form
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0)
  const sessionLabel = String(form.get("label") ?? "").slice(0, 140)

  if (files.length === 0) {
    return NextResponse.json({ error: "Attach at least one file.", code: "no_files" }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files (max ${MAX_FILES}).`, code: "too_many_files" },
      { status: 400 }
    )
  }

  let total = 0
  for (const f of files) {
    total += f.size
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${f.name || "a file"} is too large (max 12 MB).`, code: "file_too_large" },
        { status: 400 }
      )
    }
    if (!ACCEPTED_MIMES.has(f.type) && !f.name?.match(/\.(pdf|jpe?g|png|webp|heic|heif)$/i)) {
      return NextResponse.json(
        { error: `Unsupported type: ${f.type || f.name}.`, code: "bad_type" },
        { status: 400 }
      )
    }
  }
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "Total upload too large (max 40 MB).", code: "total_too_large" },
      { status: 400 }
    )
  }

  // Create session row
  const { data: sessionRow, error: sessionErr } = await supabase
    .from("lab_upload_sessions")
    .insert({
      user_id: user.id,
      label: sessionLabel,
      status: "extracting",
      file_count: files.length,
      extraction_model: "gpt-4o",
    })
    .select("id")
    .single()
  if (sessionErr || !sessionRow) {
    return NextResponse.json(
      { error: "Could not create session", detail: sessionErr?.message ?? "" },
      { status: 500 }
    )
  }
  const sessionId = sessionRow.id as string

  // Consent audit snapshot
  const ipHash = hashForConsent(ip)
  const uaHash = hashForConsent(req.headers.get("user-agent") ?? "")
  await supabase.from("user_consents").insert([
    {
      user_id: user.id,
      consent_type: "lab_processing",
      version: "audit-snapshot",
      accepted: true,
      ip_hash: ipHash,
      user_agent_hash: uaHash,
      context: { session_id: sessionId, at: "extract_api_entry" },
    },
  ])

  const extractions: Array<{
    filename: string
    mime: string
    size: number
    extraction: Extraction | null
    error: string | null
  }> = []

  for (const file of files) {
    const filename = file.name || "upload"
    const mime = file.type || ""
    try {
      // Upload raw file to storage for audit/reprocess until user confirms; deleted after confirm.
      const buf = Buffer.from(await file.arrayBuffer())
      const safePath = `${user.id}/${sessionId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      const { error: uploadErr } = await supabase.storage
        .from("lab-uploads")
        .upload(safePath, buf, {
          contentType: mime || "application/octet-stream",
          upsert: false,
        })
      if (uploadErr) {
        // Non-fatal — continue with extraction from in-memory buffer.
        // eslint-disable-next-line no-console
        console.warn("lab-upload storage upload failed:", uploadErr.message)
      }

      // PDFs are expected to have been rasterized to images client-side before upload.
      // If one slips through, flag it clearly.
      if (mime === "application/pdf") {
        await supabase.from("lab_extractions").insert({
          session_id: sessionId,
          user_id: user.id,
          original_filename: filename,
          mime_type: mime,
          file_size_bytes: file.size,
          storage_path: uploadErr ? null : safePath,
          raw_extraction: {},
          model: "gpt-4o",
          extraction_confidence: 0,
          error: "pdf_not_rasterized",
        })
        extractions.push({
          filename,
          mime,
          size: file.size,
          extraction: null,
          error:
            "This PDF was not converted to images before upload. Try re-uploading a page as JPEG, or use the built-in PDF → image converter.",
        })
        continue
      }

      const base64 = buf.toString("base64")
      const dataUrl = `data:${mime || "image/jpeg"};base64,${base64}`

      let extraction: Extraction
      try {
        extraction = await callVision(key, "gpt-4o", dataUrl, mime || "image/jpeg")
      } catch {
        extraction = await callVision(key, "gpt-4o-mini", dataUrl, mime || "image/jpeg")
      }

      await supabase.from("lab_extractions").insert({
        session_id: sessionId,
        user_id: user.id,
        original_filename: filename,
        mime_type: mime,
        file_size_bytes: file.size,
        storage_path: uploadErr ? null : safePath,
        raw_extraction: extraction as unknown as Record<string, unknown>,
        model: "gpt-4o",
        extraction_confidence: extraction.overall_confidence,
      })

      extractions.push({
        filename,
        mime,
        size: file.size,
        extraction,
        error: null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await supabase.from("lab_extractions").insert({
        session_id: sessionId,
        user_id: user.id,
        original_filename: filename,
        mime_type: mime,
        file_size_bytes: file.size,
        storage_path: null,
        raw_extraction: {},
        model: "gpt-4o",
        extraction_confidence: 0,
        error: msg.slice(0, 500),
      })
      extractions.push({
        filename,
        mime,
        size: file.size,
        extraction: null,
        error: "Extraction failed. Try a clearer photo or an individual page.",
      })
    }
  }

  await supabase
    .from("lab_upload_sessions")
    .update({
      status: "confirming",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  return NextResponse.json({
    sessionId,
    extractions,
  })
}
